import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import path from 'path';

import {
  modifyScenarios,
  resetScenarios,
  getScenarios as apiGetScenarios,
} from './apis';
import {
  getGraphQlMocks,
  getGraphQlMock,
  createGraphQlRequestHandler,
} from './graph-ql';
import {
  getHttpMocks,
  getHttpMockAndParams,
  createHttpRequestHandler,
} from './http';
import {
  Mock,
  Options,
  ScenarioMap,
  DefaultScenario,
  Context,
  Scenario,
  PartialContext,
  CookieValue,
  InternalRequest,
} from './types';
import { getUi, updateUi } from './ui';
import {
  getScenarioIdsFromCookie,
  getDataMocksServerCookie,
  setDataMocksServerCookie,
} from './cookies';
import { getContextFromScenarios } from './utils/get-context-from-scenarios';

export { createExpressApp };

function createExpressApp({
  default: defaultScenario,
  scenarios: scenarioMap = {},
  options = {},
}: {
  default: DefaultScenario;
  scenarios?: ScenarioMap;
  options?: Options;
}) {
  const {
    uiPath = '/',
    modifyScenariosPath = '/modify-scenarios',
    resetScenariosPath = '/reset-scenarios',
    scenariosPath = '/scenarios',
    cookieMode = false,
  } = options;

  const scenarioIds = Object.keys(scenarioMap);
  const groupNames = Object.values(scenarioMap).reduce<string[]>(
    (result, mock) => {
      if (
        Array.isArray(mock) ||
        mock.group == null ||
        result.includes(mock.group)
      ) {
        return result;
      }

      result.push(mock.group);
      return result;
    },
    [],
  );

  let serverSelectedScenarioIds: string[] = [];
  let serverContext = getContextFromScenarios([defaultScenario]);

  const app = express();
  app.use(cors({ credentials: true }));
  app.use(cookieParser());
  app.use(uiPath, express.static(path.join(__dirname, 'assets')));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.text({ type: 'application/graphql' }));

  app.get(
    uiPath,
    getUi({
      uiPath,
      scenarioMap,
      getSelectedScenarioIds,
    }),
  );

  app.post(
    uiPath,
    updateUi({
      uiPath,
      groupNames,
      scenarioNames: scenarioIds,
      scenarioMap,
      updateScenariosAndContext,
    }),
  );

  app.put(
    modifyScenariosPath,
    modifyScenarios({
      scenarioNames: scenarioIds,
      scenarioMap,
      updateScenariosAndContext,
    }),
  );

  app.put(
    resetScenariosPath,
    resetScenarios({
      updateScenariosAndContext,
    }),
  );

  app.get(
    scenariosPath,
    apiGetScenarios({
      scenarioMap,
      getSelectedScenarioIds,
    }),
  );

  app.use(async (req, res, next) => {
    const dataMocksServerCookie = getDataMocksServerCookie({
      getCookie: expressGetCookie(req),
      defaultScenario,
    });

    const internalRequest: InternalRequest = {
      body: req.body,
      headers: cleanExpressHeaders(req.headers || {}),
      method: req.method,
      path: req.path,
      query: req.query || {},
    };

    const result = await handleRequest({
      req: internalRequest,
      getSelectedScenarioIds: getSelectedScenarioIds2(
        () => dataMocksServerCookie,
      ),
      defaultScenario,
      scenarioMap,
      getContext: getContext(() => dataMocksServerCookie),
      setContext: setContext(context => {
        dataMocksServerCookie.context = context;
      }),
    });

    if (cookieMode) {
      setDataMocksServerCookie({
        setCookie: expressSetCookie(res),
        value: dataMocksServerCookie,
      });
    }

    if (result.status === 404) {
      next();

      return;
    }

    res
      .set(result.headers)
      .status(result.status)
      .send(result.response);
  });

  return app;

  function setContext(setCookieContext: (context: Context) => void) {
    return (context: Context) => {
      if (cookieMode) {
        setCookieContext(context);
      } else {
        serverContext = context;
      }
    };
  }

  function getSelectedScenarioIds2(getCookieValue: () => CookieValue) {
    return () => {
      if (cookieMode) {
        return getCookieValue().scenarios;
      }

      return serverSelectedScenarioIds;
    };
  }

  function getContext(getCookieValue: () => CookieValue) {
    return () => {
      if (cookieMode) {
        return getCookieValue().context;
      }

      return serverContext;
    };
  }

  function updateScenariosAndContext(
    res: Response,
    updatedScenarioNames: string[],
  ) {
    const updatedScenarios = getScenarios({
      defaultScenario,
      scenarioMap,
      scenarioIds: updatedScenarioNames,
    });
    const context = getContextFromScenarios(updatedScenarios);

    if (cookieMode) {
      setDataMocksServerCookie({
        setCookie: expressSetCookie(res),
        value: {
          context,
          scenarios: updatedScenarioNames,
        },
      });

      return;
    }

    serverContext = context;
    serverSelectedScenarioIds = updatedScenarioNames;

    return updatedScenarioNames;
  }

  function getSelectedScenarioIds(req: Request, res: Response) {
    if (cookieMode) {
      return getScenarioIdsFromCookie({
        req,
        res,
        defaultValue: {
          context: getContextFromScenarios([defaultScenario]),
          scenarios: [],
        },
      });
    }

    return serverSelectedScenarioIds;
  }
}

function updateContext(context: Context, partialContext: PartialContext) {
  const newContext: Context = {
    ...context,
    ...(typeof partialContext === 'function'
      ? partialContext(context)
      : partialContext),
  };

  return newContext;
}

function mergeMocks(scenarioMap: ({ mocks: Mock[] } | Mock[])[]) {
  return scenarioMap.reduce<Mock[]>(
    (result, scenarioMock) =>
      result.concat(
        Array.isArray(scenarioMock) ? scenarioMock : scenarioMock.mocks,
      ),
    [],
  );
}

function getMocksFromScenarios(scenarios: Scenario[]) {
  const mocks = mergeMocks(scenarios);
  const httpMocks = getHttpMocks(mocks);
  const graphQlMocks = getGraphQlMocks(mocks);

  return { httpMocks, graphQlMocks };
}

function getScenarios({
  defaultScenario,
  scenarioMap,
  scenarioIds,
}: {
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  scenarioIds: string[];
}): Scenario[] {
  return [defaultScenario].concat(
    scenarioIds.map(scenarioId => scenarioMap[scenarioId]),
  );
}

async function handleRequest({
  req,
  getSelectedScenarioIds,
  defaultScenario,
  scenarioMap,
  getContext,
  setContext,
}: {
  req: InternalRequest;
  getSelectedScenarioIds: () => string[];
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  getContext: () => Context;
  setContext: (context: Context) => void;
}) {
  const selectedScenarioIds = getSelectedScenarioIds();
  const selectedScenarios = getScenarios({
    defaultScenario,
    scenarioMap,
    scenarioIds: selectedScenarioIds,
  });

  const { httpMocks, graphQlMocks } = getMocksFromScenarios(selectedScenarios);

  const graphQlMock = getGraphQlMock(req.path, graphQlMocks);

  if (graphQlMock) {
    const requestHandler = createGraphQlRequestHandler({
      graphQlMock,
      updateContext: localUpdateContext,
      getContext,
    });

    return requestHandler(req);
  }

  const { httpMock, params } = getHttpMockAndParams(req, httpMocks);
  if (httpMock) {
    const requestHandler = createHttpRequestHandler({
      httpMock,
      params,
      getContext,
      updateContext: localUpdateContext,
    });

    return requestHandler(req);
  }

  return { status: 404 };

  function localUpdateContext(partialContext: PartialContext) {
    const newContext = updateContext(getContext(), partialContext);

    setContext(newContext);

    return newContext;
  }
}

function expressGetCookie(req: Request) {
  return (cookieName: string) => req.cookies[cookieName];
}

function expressSetCookie(res: Response) {
  return (cookieName: string, cookieValue: string) => {
    res.cookie(cookieName, cookieValue, { encode: String });
  };
}

function cleanExpressHeaders(
  headers: Request['headers'],
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      (keyValuePair): keyValuePair is [string, string] =>
        typeof keyValuePair[1] === 'string',
    ),
  );
}
