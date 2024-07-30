import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import path from 'path';

import {
  Options,
  ScenarioMap,
  DefaultScenario,
  Context,
  InternalRequest,
  Result,
} from './types';
import { getUi, updateUi } from './ui';
import { getContextFromScenarios } from './utils/get-context-from-scenarios';
import { handleRequest } from './handle-request';
import {
  getScenarios as apiGetScenarios,
  modifyScenarios,
  resetScenarios,
} from './apis';

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
  app.use(
    express.urlencoded({
      extended: false,
      limit: '10mb',
      parameterLimit: 100000,
    }),
  );
  app.use(express.json());
  app.use(express.text({ type: 'application/graphql' }));

  app.get(uiPath, (req, res) => {
    const html = getUi({
      uiPath,
      scenarioMap,
      cookieMode,
      defaultScenario,
      getCookie: expressGetCookie(req),
      getServerSelectedScenarioIds,
      setCookie: expressSetCookie(res),
    });

    res.send(html);
  });

  app.post(
    uiPath,
    ({ body: { scenarios: scenariosBody, button, ...rest } }, res) => {
      const html = updateUi({
        uiPath,
        groupNames,
        scenarioIds,
        updatedScenarioIds: scenariosBody,
        buttonType: button,
        scenarioMap,
        cookieMode,
        defaultScenario,
        setCookie: expressSetCookie(res),
        setServerContext,
        setServerSelectedScenarioIds,
        groupScenario: rest,
      });

      res.send(html);
    },
  );

  app.put(
    modifyScenariosPath,
    ({ body: { scenarios: updatedScenarioIds } }: Request, res: Response) => {
      const result = modifyScenarios({
        cookieMode,
        defaultScenario,
        scenarioIds,
        scenarioMap,
        setCookie: expressSetCookie(res),
        setServerContext,
        setServerSelectedScenarioIds,
        updatedScenarioIds,
      });

      expressResponse(res, result);
    },
  );

  app.put(resetScenariosPath, (_, res: Response) => {
    const result = resetScenarios({
      setCookie: expressSetCookie(res),
      setServerContext,
      setServerSelectedScenarioIds,
      defaultScenario,
      scenarioMap,
      cookieMode,
    });

    expressResponse(res, result);
  });

  app.get(scenariosPath, (req: Request, res: Response) => {
    const result = apiGetScenarios({
      getCookie: expressGetCookie(req),
      setCookie: expressSetCookie(res),
      getServerSelectedScenarioIds,
      cookieMode,
      defaultScenario,
      scenarioMap,
    });

    expressResponse(res, result);
  });

  app.use(async (req, res) => {
    const internalRequest: InternalRequest = {
      body: req.body,
      headers: expressCleanHeaders(req.headers || {}),
      method: req.method,
      path: req.path,
      query: req.query || {},
    };

    const result = await handleRequest({
      req: internalRequest,
      getServerSelectedScenarioIds,
      defaultScenario,
      scenarioMap,
      getServerContext: () => serverContext,
      setServerContext,
      cookieMode,
      getCookie: expressGetCookie(req),
      setCookie: expressSetCookie(res),
    });

    expressResponse(res, result);
  });

  return app;

  function getServerSelectedScenarioIds() {
    return serverSelectedScenarioIds;
  }

  function setServerContext(context: Context) {
    serverContext = context;
  }

  function setServerSelectedScenarioIds(selectedScenarioIds: string[]) {
    serverSelectedScenarioIds = selectedScenarioIds;
  }
}

function expressSetCookie(res: Response) {
  return (cookieName: string, cookieValue: string) => {
    res.cookie(cookieName, cookieValue, { encode: String });
  };
}

function expressGetCookie(req: Request) {
  return (cookieName: string) => req.cookies[cookieName];
}

function expressCleanHeaders(
  headers: Request['headers'],
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      (keyValuePair): keyValuePair is [string, string] =>
        typeof keyValuePair[1] === 'string',
    ),
  );
}

function expressResponse(res: Response, { status, headers, response }: Result) {
  res
    .set(headers)
    .status(status)
    .send(
      headers && headers['content-type'] === 'application/json'
        ? JSON.stringify(response)
        : response,
    );
}
