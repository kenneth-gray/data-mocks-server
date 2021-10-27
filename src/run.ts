import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { transform } from 'server-with-kill';

import { modifyScenarios, resetScenarios } from './apis';
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
  getScenariosFromCookie,
  getContextFromCookie,
  setScenariosCookie,
  setContextCookie,
} from './cookies';

export { run };

function run({
  default: defaultScenario,
  scenarios: scenarioMap = {},
  options = {},
}: {
  default: DefaultScenario;
  scenarios?: ScenarioMap;
  options?: Options;
}) {
  let selectedScenarioNames: string[] = [];
  let currentContext = getContextFromScenarios([defaultScenario]);
  const {
    port = 3000,
    uiPath = '/',
    modifyScenariosPath = '/modify-scenarios',
    resetScenariosPath = '/reset-scenarios',
    cookieMode = false,
  } = options;

  const app = express();
  const scenarioNames = Object.keys(scenarioMap);
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

  app.use(cors());
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
      getScenarioNames,
    }),
  );

  app.post(
    uiPath,
    updateUi({
      uiPath,
      groupNames,
      scenarioNames,
      scenarioMap,
      updateScenariosAndContext,
    }),
  );

  app.put(
    modifyScenariosPath,
    modifyScenarios({
      scenarioNames,
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

  app.use(
    createRequestHandler({
      getScenarioNames,
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
            defaultValue: getContextFromScenarios(selectedScenarios),
          });
        }

        return currentContext;
      },
      setContext: (res: Response, context: Context) => {
        if (cookieMode) {
          setContextCookie(res, context);
        } else {
          currentContext = context;
        }
      },
    }),
  );

  return transform(
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }),
  );

  function updateScenariosAndContext(
    res: Response,
    updatedScenarioNames: string[],
  ) {
    const updatedScenarios = getScenarios({
      defaultScenario,
      scenarioMap,
      scenarioNames: updatedScenarioNames,
    });
    const context = getContextFromScenarios(updatedScenarios);

    if (cookieMode) {
      setContextCookie(res, context);
      setScenariosCookie(res, updatedScenarioNames);

      return;
    }

    currentContext = context;
    selectedScenarioNames = updatedScenarioNames;

    return updatedScenarioNames;
  }

  function getScenarioNames(req: Request, res: Response) {
    if (cookieMode) {
      return getScenariosFromCookie({ req, res, defaultValue: [] });
    }

    return selectedScenarioNames;
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
  scenarioNames,
}: {
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  scenarioNames: string[];
}): Scenario[] {
  return [defaultScenario].concat(
    scenarioNames.map(scenario => scenarioMap[scenario]),
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
  getScenarioNames,
  defaultScenario,
  scenarioMap,
  getContext,
  setContext,
}: {
  getScenarioNames: (req: Request, res: Response) => string[];
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  getContext: (
    req: Request,
    res: Response,
    selectedScenarios: Scenario[],
  ) => Context;
  setContext: (res: Response, context: Context) => void;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const scenarioNames = getScenarioNames(req, res);
    const selectedScenarios = getScenarios({
      defaultScenario,
      scenarioMap,
      scenarioNames,
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

      setContext(res, context);

      return context;
    }

    function localGetContext() {
      return context;
    }
  };
}
