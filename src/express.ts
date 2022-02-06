import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
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
} from './types';
import { getUi, updateUi } from './ui';
import {
  getScenarioIdsFromCookie,
  getContextFromCookie,
  setContextAndScenariosCookie,
} from './cookies';

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

  app.use(
    createRequestHandler({
      getSelectedScenarioIds,
      defaultScenario,
      scenarioMap,
      getContext: (
        req: Request,
        res: Response,
        selectedScenarios: Scenario[],
      ) => {
        if (cookieMode) {
          return getContextFromCookie({
            req,
            res,
            defaultValue: {
              scenarios: getSelectedScenarioIds(req, res),
              context: getContextFromScenarios(selectedScenarios),
            },
          });
        }

        return serverContext;
      },
      setContext: (req: Request, res: Response, context: Context) => {
        if (cookieMode) {
          setContextAndScenariosCookie(res, {
            scenarios: getSelectedScenarioIds(req, res),
            context,
          });
        } else {
          serverContext = context;
        }
      },
    }),
  );

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
      setContextAndScenariosCookie(res, {
        context,
        scenarios: updatedScenarioNames,
      });

      return;
    }

    serverContext = context;
    serverSelectedScenarioIds = updatedScenarioNames;

    return updatedScenarioNames;
  }

  function getSelectedScenarioIds(req: Request, res: Response) {
    if (cookieMode) {
      const defaultScenarioIds: string[] = [];

      return getScenarioIdsFromCookie({
        req,
        res,
        defaultValue: {
          context: getContextFromScenarios(
            getScenarios({
              defaultScenario,
              scenarioMap,
              scenarioIds: defaultScenarioIds,
            }),
          ),
          scenarios: defaultScenarioIds,
        },
      });
    }

    return serverSelectedScenarioIds;
  }
}

function updateContext(context: Context, partialContext: PartialContext) {
  const newContext = {
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

function getContextFromScenarios(scenarios: Scenario[]) {
  let context: Context = {};
  scenarios.forEach(mock => {
    if (!Array.isArray(mock) && mock.context) {
      context = { ...context, ...mock.context };
    }
  });

  return context;
}

function createRequestHandler({
  getSelectedScenarioIds,
  defaultScenario,
  scenarioMap,
  getContext,
  setContext,
}: {
  getSelectedScenarioIds: (req: Request, res: Response) => string[];
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  getContext: (
    req: Request,
    res: Response,
    selectedScenarios: Scenario[],
  ) => Context;
  setContext: (req: Request, res: Response, context: Context) => void;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const selectedScenarioIds = getSelectedScenarioIds(req, res);
    const selectedScenarios = getScenarios({
      defaultScenario,
      scenarioMap,
      scenarioIds: selectedScenarioIds,
    });

    const { httpMocks, graphQlMocks } = getMocksFromScenarios(
      selectedScenarios,
    );
    let context: Context = getContext(req, res, selectedScenarios);

    const graphQlMock = getGraphQlMock(req, graphQlMocks);

    if (graphQlMock) {
      const requestHandler = createGraphQlRequestHandler({
        graphQlMock,
        updateContext: localUpdateContext,
        getContext: localGetContext,
      });

      requestHandler(req, res, next);

      return;
    }

    const { httpMock, params } = getHttpMockAndParams(req, httpMocks);
    if (httpMock) {
      const requestHandler = createHttpRequestHandler({
        httpMock,
        params,
        getContext: localGetContext,
        updateContext: localUpdateContext,
      });

      requestHandler(req, res);

      return;
    }

    // Nothing matched - default 404 from express
    next();

    function localUpdateContext(partialContext: PartialContext) {
      // Although "setContext" below will ensure the context is set correctly
      // for the server/cookie, if response functions call "updateContext" multiple
      // times, the local version of "getContext" will return the wrong value
      context = updateContext(context, partialContext);

      setContext(req, res, context);

      return context;
    }

    function localGetContext() {
      return context;
    }
  };
}
