import express from 'express';
import nunjucks from 'nunjucks';

import { Scenarios, Mock, Options } from './types';

type Message = {
  scenarios: Scenarios;
  scenario: string;
  options: Options;
};

process.on('message', (message: Message) => {
  startServer(message);
});

function startServer({ scenarios, scenario, options }: Message) {
  const app = express();

  nunjucks.configure(__dirname, {
    autoescape: true,
    express: app,
  });

  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_, res) => {
    res.render('index.njk', {
      scenarios: Object.keys(scenarios),
      selectedScenario: scenario,
    });
  });

  app.post('/', ({ body: { scenario } }, res) => {
    res.render('index.njk', {
      scenarios: Object.keys(scenarios),
      selectedScenario: scenario,
      updatedScenario: scenario,
    });

    // This makes sure the response is sent before removing the server
    setTimeout(() => {
      process.send && process.send({ scenario });
    });
  });

  console.log('Current scenario:', scenario);
  const mocks: Mock[] = reduceAllMocksForScenario(scenarios, scenario);

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
          app.get(url, (_, res) => {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        case 'POST':
          app.post(url, (_, res) => {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        case 'PUT':
          app.put(url, (_, res) => {
            addDelay(delay).then(() => {
              res
                .set(responseHeaders)
                .status(responseCode)
                .json(response);
            });
          });
          break;
        case 'DELETE':
          app.delete(url, (_, res) => {
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

  const { port = 3000 } = options;

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

function addDelay(delay: number) {
  return new Promise(res => setTimeout(res, delay));
}

function reduceAllMocksForScenario(
  scenarios: Scenarios,
  scenario: string,
): Mock[] {
  if (scenario === 'default') {
    return scenarios.default;
  }

  const defaultMocks = scenarios.default;
  const scenarioMocks = scenarios[scenario];

  if (!scenarioMocks) {
    throw new Error(`No mocks found for scenario '${scenario}'`);
  }

  return defaultMocks
    .filter(
      defaultMock =>
        !scenarioMocks.find(
          scenarioMock =>
            scenarioMock.url.toString() === defaultMock.url.toString() &&
            defaultMock.method === scenarioMock.method,
        ),
    )
    .concat(scenarioMocks);
}
