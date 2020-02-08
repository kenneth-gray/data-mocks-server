import cors from 'cors';
import express, { Router } from 'express';
import nunjucks from 'nunjucks';
import path from 'path';
import { transform } from 'server-with-kill';

import { modifyScenarios, resetScenarios } from './apis';
import { getGraphQlMocks, applyGraphQlRoutes } from './graph-ql';
import { getHttpMocks, applyHttpRoutes } from './http';
import { Mock, Options, Scenarios, Default, Context } from './types';
import { getUi, updateUi } from './ui';

export * from './types';
export { run };

function run({
  default: defaultMocks,
  scenarios: scenarioMocks = {},
  options = {},
}: {
  default: Default;
  scenarios?: Scenarios;
  options?: Options;
}) {
  let selectedScenarios: string[] = [];
  let router: Router;
  updateScenarios([]);

  const {
    port = 3000,
    uiPath = '/',
    modifyScenariosPath = '/modify-scenarios',
    resetScenariosPath = '/reset-scenarios',
  } = options;
  const app = express();
  const scenarioNames = Object.keys(scenarioMocks);
  const groupNames = Object.values(scenarioMocks).reduce<string[]>(
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

  nunjucks.configure(__dirname, {
    autoescape: true,
    express: app,
  });

  app.use(cors());
  app.use(uiPath, express.static(path.join(__dirname, 'assets')));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.text({ type: 'application/graphql' }));

  app.get(
    uiPath,
    getUi({ scenarioMocks, getScenarios: () => selectedScenarios }),
  );

  app.post(
    uiPath,
    updateUi({ groupNames, scenarioNames, scenarioMocks, updateScenarios }),
  );

  app.put(
    modifyScenariosPath,
    modifyScenarios({ scenarioNames, scenarioMocks, updateScenarios }),
  );

  app.put(resetScenariosPath, resetScenarios({ updateScenarios }));

  app.use((req, res, next) => {
    router(req, res, next);
  });

  return transform(
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }),
  );

  function updateScenarios(updatedScenarios: string[]) {
    selectedScenarios = updatedScenarios;
    console.log('Selected scenarios', selectedScenarios);

    router = createRouter({
      defaultMocks,
      scenarioMocks,
      scenarios: selectedScenarios,
    });
  }
}

function createRouter({
  defaultMocks,
  scenarioMocks,
  scenarios,
}: {
  defaultMocks: Default;
  scenarioMocks: Scenarios;
  scenarios: string[];
}) {
  const defaultAndScenarioMocks = [defaultMocks].concat(
    scenarios.map(scenario => scenarioMocks[scenario]),
  );

  let context = getInitialContext(defaultAndScenarioMocks);

  const mocks = getMocks(defaultAndScenarioMocks);
  const httpMocks = getHttpMocks(mocks);
  const graphQlMocks = getGraphQlMocks(mocks);

  const router = Router();

  applyHttpRoutes({ router, httpMocks, getContext, updateContext });
  applyGraphQlRoutes({ router, graphQlMocks, getContext, updateContext });

  return router;

  function updateContext(partialContext: Context) {
    context = { ...context, ...partialContext };

    return context;
  }

  function getContext() {
    return context;
  }
}

function getMocks(scenarioMocks: ({ mocks: Mock[] } | Mock[])[]) {
  return scenarioMocks.reduce<Mock[]>(
    (result, scenarioMock) =>
      result.concat(
        Array.isArray(scenarioMock) ? scenarioMock : scenarioMock.mocks,
      ),
    [],
  );
}

function getInitialContext(mocks: ({ context?: Context } | any[])[]) {
  let context: Context = {};
  mocks.forEach(mock => {
    if (!Array.isArray(mock) && mock.context) {
      context = { ...context, ...mock.context };
    }
  });

  return context;
}
