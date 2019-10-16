import express, { Router } from 'express';
import nunjucks from 'nunjucks';

import { Scenarios, Options, Mock } from './types';

export * from './types';

type Input = {
  default: Mock[];
  scenarios?: Scenarios;
  options?: Options;
};

export function run({
  default: defaultMocks,
  scenarios: scenarioMocks = {},
  options = {},
}: Input) {
  let selectedScenarios: string[] = [];
  let router = createRouter({
    defaultMocks,
    scenarioMocks,
    selectedScenarios,
  });
  const app = express();
  const scenarios = Object.keys(scenarioMocks);

  nunjucks.configure(__dirname, {
    autoescape: true,
    express: app,
  });

  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_, res) => {
    res.render('index.njk', {
      scenarios: scenarios.map(scenario => ({
        name: scenario,
        checked: selectedScenarios.includes(scenario),
      })),
    });
  });

  app.post('/', ({ body: { scenarios: scenariosBody } }, res) => {
    selectedScenarios =
      scenariosBody == null
        ? []
        : typeof scenariosBody === 'string'
        ? [scenariosBody]
        : scenariosBody;

    res.render('index.njk', {
      scenarios: scenarios.map(scenario => ({
        name: scenario,
        checked: selectedScenarios.includes(scenario),
      })),
      selectedScenarios,
    });

    router = createRouter({
      defaultMocks,
      scenarioMocks,
      selectedScenarios,
    });
  });

  app.use(function middleware(req, res, next) {
    router(req, res, next);
  });

  const { port = 3000 } = options;

  return app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

function addDelay(delay: number) {
  return new Promise(res => setTimeout(res, delay));
}

function reduceAllMocksForScenarios({
  defaultMocks,
  scenarioMocks,
  selectedScenarios,
}: {
  defaultMocks: Mock[];
  scenarioMocks: Scenarios;
  selectedScenarios: string[];
}): Mock[] {
  if (selectedScenarios.length === 0) {
    return defaultMocks;
  }

  const reducedMocks = selectedScenarios.reduce<Mock[]>(
    (result, selectedScenario) => {
      const mocks = scenarioMocks[selectedScenario];

      if (!mocks) {
        return result;
      }

      return result.concat(mocks);
    },
    [],
  );

  return defaultMocks
    .filter(
      defaultMock =>
        !reducedMocks.find(
          mock =>
            mock.url.toString() === defaultMock.url.toString() &&
            defaultMock.method === mock.method,
        ),
    )
    .concat(reducedMocks);
}

type CreateRouterInput = {
  defaultMocks: Mock[];
  scenarioMocks: Scenarios;
  selectedScenarios: string[];
};

function createRouter({
  defaultMocks,
  scenarioMocks,
  selectedScenarios,
}: CreateRouterInput) {
  const router = Router();

  console.log('Current scenarios:', selectedScenarios);
  const mocks: Mock[] = reduceAllMocksForScenarios({
    defaultMocks,
    scenarioMocks,
    selectedScenarios,
  });

  mocks.forEach(
    ({
      method,
      url,
      response,
      responseCode = 200,
      responseHeaders,
      delay = 0,
    }) => {
      switch (method) {
        case 'GET':
          router.get(url, function routeGet(_, res) {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        case 'POST':
          router.post(url, function routePost(_, res) {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        case 'PUT':
          router.put(url, function routePut(_, res) {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        case 'DELETE':
          router.delete(url, function routeDelete(_, res) {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        default:
          throw new Error(
            `Unrecognised HTTP method ${method} - please check your mock configuration`,
          );
      }
    },
  );

  return router;
}
