import express from 'express';
import nunjucks from 'nunjucks';

import { Scenarios, Mock, Options } from './types';

type Message = {
  defaultScenario: Mock[];
  scenarios: Scenarios;
  selectedScenarios: string[];
  options: Options;
};

process.on('message', (message: Message) => {
  startServer(message);
});

function startServer({
  defaultScenario,
  scenarios,
  selectedScenarios,
  options,
}: Message) {
  const app = express();
  const scenariosList = Object.keys(scenarios);

  nunjucks.configure(__dirname, {
    autoescape: true,
    express: app,
  });

  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_, res) => {
    res.render('index.njk', {
      scenarios: scenariosList.map(scenario => ({
        name: scenario,
        checked: selectedScenarios.includes(scenario),
      })),
    });
  });

  app.post('/', ({ body: { scenarios } }, res) => {
    const updatedScenarios =
      scenarios == null
        ? []
        : typeof scenarios === 'string'
        ? [scenarios]
        : scenarios;

    res.render('index.njk', {
      scenarios: scenariosList.map(scenario => ({
        name: scenario,
        checked: updatedScenarios.includes(scenario),
      })),
      updatedScenarios,
    });

    // This makes sure the response is sent before removing the server
    setTimeout(() => {
      process.send && process.send(updatedScenarios);
    });
  });

  console.log('Current scenarios:', selectedScenarios);
  const mocks: Mock[] = reduceAllMocksForScenarios({
    defaultScenario,
    scenarios,
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

function reduceAllMocksForScenarios({
  defaultScenario,
  scenarios,
  selectedScenarios,
}: {
  defaultScenario: Mock[];
  scenarios: Scenarios;
  selectedScenarios: string[];
}): Mock[] {
  if (selectedScenarios.length === 0) {
    return defaultScenario;
  }

  const scenarioMocks = selectedScenarios.reduce<Mock[]>(
    (result, selectedScenario) => {
      const mocks = scenarios[selectedScenario];

      if (!mocks) {
        return result;
      }

      return result.concat(mocks);
    },
    [],
  );

  return defaultScenario
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
