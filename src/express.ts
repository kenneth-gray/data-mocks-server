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
  InternalRequest,
  Result,
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
    const internalRequest: InternalRequest = {
      body: req.body,
      headers: cleanExpressHeaders(req.headers || {}),
      method: req.method,
      path: req.path,
      query: req.query || {},
    };

    const result = await handleRequest({
      req: internalRequest,
      getServerSelectedScenarioIds: () => serverSelectedScenarioIds,
      defaultScenario,
      scenarioMap,
      getServerContext: () => serverContext,
      setServerContext: (context: Context) => {
        serverContext = context;
      },
      cookieMode,
      getCookie: (cookieName: string) => req.cookies[cookieName],
      setCookie: expressSetCookie(res),
    });

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
  getServerSelectedScenarioIds,
  defaultScenario,
  scenarioMap,
  getServerContext,
  setServerContext,
  getCookie,
  cookieMode,
  setCookie,
}: {
  req: InternalRequest;
  getServerSelectedScenarioIds: () => string[];
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  getServerContext: () => Context;
  setServerContext: (context: Context) => void;
  getCookie: (cookieName: string) => string;
  setCookie: (cookieName: string, cookieValue: string) => void;
  cookieMode: boolean;
}) {
  const dataMocksServerCookie = getDataMocksServerCookie({
    getCookie,
    defaultScenario,
  });

  const getSelectedScenarioIds = cookieMode
    ? () => dataMocksServerCookie.scenarios
    : getServerSelectedScenarioIds;

  const getContext = cookieMode
    ? () => dataMocksServerCookie.context
    : getServerContext;

  const setContext = cookieMode
    ? (context: Context) => {
        dataMocksServerCookie.context = context;
      }
    : setServerContext;

  const selectedScenarioIds = getSelectedScenarioIds();

  const selectedScenarios = getScenarios({
    defaultScenario,
    scenarioMap,
    scenarioIds: selectedScenarioIds,
  });

  const { httpMocks, graphQlMocks } = getMocksFromScenarios(selectedScenarios);

  const graphQlMock = getGraphQlMock(req.path, graphQlMocks);

  // Default when nothing matches
  let result: Result = { status: 404 };

  if (graphQlMock) {
    const requestHandler = createGraphQlRequestHandler({
      graphQlMock,
      updateContext: localUpdateContext,
      getContext,
    });

    result = await requestHandler(req);
  } else {
    const { httpMock, params } = getHttpMockAndParams(req, httpMocks);
    if (httpMock) {
      const requestHandler = createHttpRequestHandler({
        httpMock,
        params,
        getContext,
        updateContext: localUpdateContext,
      });

      result = await requestHandler(req);
    }
  }

  if (cookieMode) {
    setDataMocksServerCookie({ setCookie, value: dataMocksServerCookie });
  }

  return result;

  function localUpdateContext(partialContext: PartialContext) {
    const newContext = updateContext(getContext(), partialContext);

    setContext(newContext);

    return newContext;
  }
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
