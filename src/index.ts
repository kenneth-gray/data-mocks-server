import express, { Router, Request, Response } from 'express';
import gql from 'graphql-tag';
import nunjucks from 'nunjucks';
import path from 'path';
import { transform } from 'server-with-kill';

import {
  GraphqlMock,
  Groups,
  Mock,
  Options,
  ResponseFunction,
  Scenarios,
  MockResponse,
  Override,
} from './types';
import { NextFunction } from 'connect';

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
  let selectedScenarios: string[];
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
      if (Array.isArray(mock) || result.includes(mock.group)) {
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

  app.use(uiPath, express.static(path.join(__dirname, 'assets')));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.get(uiPath, (_, res) => {
    const { groups, other } = getPageVariables(
      scenarioMocks,
      selectedScenarios,
    );

    res.render('index.njk', {
      groups,
      other,
    });
  });

  app.post(uiPath, ({ body: { scenarios: scenariosBody, ...rest } }, res) => {
    let updatedScenarios = groupNames.reduce<string[]>((result, groupName) => {
      if (rest[groupName]) {
        result.push(rest[groupName]);
      }

      return result;
    }, []);
    updatedScenarios = updatedScenarios.concat(
      scenariosBody == null
        ? []
        : typeof scenariosBody === 'string'
        ? [scenariosBody]
        : scenariosBody,
    );
    updatedScenarios = updatedScenarios.filter(scenarioName =>
      scenarioNames.includes(scenarioName),
    );

    updateScenarios(updatedScenarios);

    const { groups, other } = getPageVariables(scenarioMocks, updatedScenarios);

    res.render('index.njk', {
      groups,
      other,
      updatedScenarios,
    });
  });

  app.put(
    modifyScenariosPath,
    ({ body: { scenarios: scenariosBody } }, res) => {
      if (!Array.isArray(scenariosBody)) {
        res.status(400).json({
          message:
            '"scenarios" must be an array of scenario names (empty array allowed)',
        });
        return;
      }

      for (const scenario of scenariosBody) {
        if (!scenarioNames.includes(scenario)) {
          res.status(400).json({
            message: `Scenario "${scenario}" does not exist`,
          });
          return;
        }
      }

      try {
        updateScenarios(scenariosBody);
      } catch ({ message }) {
        res.status(400).json({ message });
        return;
      }

      res.sendStatus(204);
    },
  );

  app.put(resetScenariosPath, (_, res) => {
    updateScenarios([]);
    res.sendStatus(204);
  });

  app.use((req, res, next) => {
    router(req, res, next);
  });

  return transform(
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }),
  );

  function updateScenarios(updatedScenarios: string[]) {
    router = createRouter({
      defaultMocks,
      scenarioMocks,
      selectedScenarios: updatedScenarios,
    });

    selectedScenarios = updatedScenarios;
    console.log('Selected scenarios', updatedScenarios);
  }
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

  const { reducedMocks } = selectedScenarios.reduce<{
    groups: Record<string, string>;
    reducedMocks: Mock[];
  }>(
    (result, selectedScenario) => {
      const mocks = scenarioMocks[selectedScenario];

      if (Array.isArray(mocks)) {
        result.reducedMocks = result.reducedMocks.concat(mocks);

        return result;
      }

      if (result.groups[mocks.group]) {
        throw new Error(
          `Scenario "${selectedScenario}" cannot be selected, because scenario "${
            result.groups[mocks.group]
          }" from group "${mocks.group}" has already been selected`,
        );
      }

      result.groups[mocks.group] = selectedScenario;
      result.reducedMocks = result.reducedMocks.concat(mocks.mocks);

      return result;
    },
    { groups: {}, reducedMocks: [] },
  );

  const defaultMocksFilteredGraphql = defaultMocks.reduce<Mock[]>(
    (result, defaultMock) => {
      if (defaultMock.method !== 'GRAPHQL') {
        result.push(defaultMock);

        return result;
      }

      const filteredGraphqlMock = {
        ...defaultMock,
        operations: defaultMock.operations.filter(
          ({ operationName: defaultMockOperationName }) => {
            if (
              reducedMocks.some(
                mock =>
                  mock.method === 'GRAPHQL' &&
                  mock.url === defaultMock.url &&
                  mock.operations.some(
                    ({ operationName }) =>
                      operationName === defaultMockOperationName,
                  ),
              )
            ) {
              // Remove defaultMock operation
              return false;
            }

            return true;
          },
        ),
      };

      result.push(filteredGraphqlMock);

      return result;
    },
    [],
  );

  return defaultMocksFilteredGraphql
    .filter(defaultMock => {
      // Multiple graphql urls are allowed and the graphql operations have veen filtered out above
      if (defaultMock.method === 'GRAPHQL') {
        return true;
      }

      return !reducedMocks.some(
        mock =>
          mock.url.toString() === defaultMock.url.toString() &&
          defaultMock.method === mock.method,
      );
    })
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

  const grapqhlUrlToHandlers: Record<
    string,
    {
      queries: GraphqlHandler[];
      mutations: GraphqlHandler[];
    }
  > = {};
  const mocks = reduceAllMocksForScenarios({
    defaultMocks,
    scenarioMocks,
    selectedScenarios,
  });

  mocks.forEach(mock => {
    if (mock.method === 'GRAPHQL') {
      const { queries, mutations } = mock.operations.reduce<{
        queries: GraphqlHandler[];
        mutations: GraphqlHandler[];
      }>(
        (result, operation) => {
          const handler = createGraphqlHandler(operation);

          if (operation.type === 'mutation') {
            result.mutations.push(handler);
          } else {
            result.queries.push(handler);
          }

          return result;
        },
        { queries: [], mutations: [] },
      );

      if (!grapqhlUrlToHandlers[mock.url]) {
        grapqhlUrlToHandlers[mock.url] = { queries: [], mutations: [] };
      }

      grapqhlUrlToHandlers[mock.url].queries = grapqhlUrlToHandlers[
        mock.url
      ].queries.concat(queries);
      grapqhlUrlToHandlers[mock.url].mutations = grapqhlUrlToHandlers[
        mock.url
      ].mutations.concat(mutations);

      return;
    }

    const { method, url, ...rest } = mock;

    const handler = createHandler(rest);

    switch (mock.method) {
      case 'GET':
        router.get(url, (req, res) => {
          handler(req, res);
        });
        break;
      case 'POST':
        router.post(url, (req, res) => {
          handler(req, res);
        });
        break;
      case 'PUT':
        router.put(url, (req, res) => {
          handler(req, res);
        });
        break;
      case 'DELETE':
        router.delete(url, (req, res) => {
          handler(req, res);
        });
        break;
      default:
        throw new Error(
          `Unrecognised HTTP method ${method} - please check your mock configuration`,
        );
    }
  });

  Object.entries(grapqhlUrlToHandlers).forEach(
    ([url, { queries, mutations }]) => {
      router.get(url, createGraphqlRequestHandler(queries));
      router.post(url, createGraphqlRequestHandler(queries.concat(mutations)));
    },
  );

  return router;
}

function getPageVariables(
  scenarioMocks: Scenarios,
  selectedScenarios: string[],
) {
  const { other, ...groupedScenarios } = Object.entries(scenarioMocks).reduce<{
    other: string[];
    [key: string]: string[];
  }>(
    (result, [scenarioName, scenarioMock]) => {
      if (Array.isArray(scenarioMock)) {
        result.other.push(scenarioName);

        return result;
      }

      const { group } = scenarioMock;

      if (!result[group]) {
        result[group] = [];
      }

      result[group].push(scenarioName);

      return result;
    },
    { other: [] },
  );

  const groups = Object.entries(groupedScenarios).reduce<Groups>(
    (result, [name, groupScenarios]) => {
      let noneChecked = true;
      const scenarios = groupScenarios.map(scenario => {
        const checked = selectedScenarios.includes(scenario);
        if (checked) {
          noneChecked = false;
        }

        return {
          name: scenario,
          checked,
        };
      });

      result.push({
        noneChecked,
        name,
        scenarios,
      });

      return result;
    },
    [],
  );

  return {
    groups,
    other: other.map(scenario => ({
      name: scenario,
      checked: selectedScenarios.includes(scenario),
    })),
  };
}

type GraphqlHandler = (
  req: {
    body: Request['body'] & {
      operationName: string;
      variables: any;
      query: string;
    };
    params: Request['params'];
    query: Request['query'];
  },
  res: Response,
) => boolean;

function createGraphqlHandler({
  operationName: operationNameToCheck,
  ...rest
}: {
  operationName: string;
  response: GraphqlMock['operations'][0]['response'];
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
}) {
  const handler = createHandler(rest);

  const graphqlHandler: GraphqlHandler = (req, res) => {
    if (operationNameToCheck === req.body.operationName) {
      handler(
        {
          operationName: req.body.operationName,
          query: req.body.query,
          variables: req.body.variables,
        },
        res,
      );

      return true;
    }

    return false;
  };

  return graphqlHandler;
}

function createHandler<TResponse, TInput>({
  response,
  responseCode = 200,
  responseHeaders,
  delay = 0,
}: {
  response: MockResponse<TResponse, TInput>;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
}) {
  return async (req: TInput, res: Response) => {
    const actualResponse =
      typeof response === 'function'
        ? await ((response as unknown) as ResponseFunction<TResponse, TInput>)(
            req,
          )
        : response;

    let responseCollection = {
      response: actualResponse,
      delay,
      responseHeaders,
      responseCode,
    };
    if (
      typeof actualResponse === 'object' &&
      (actualResponse as Override<TResponse>).__override &&
      Object.keys(actualResponse).length === 1
    ) {
      responseCollection = {
        ...responseCollection,
        ...(actualResponse as Override<TResponse>).__override,
      };
    }

    await addDelay(responseCollection.delay);

    res
      .set(responseCollection.responseHeaders)
      .status(responseCollection.responseCode)
      .json(responseCollection.response);
  };
}

function createGraphqlRequestHandler(handlers: GraphqlHandler[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const query = req.body.query || req.query.query || '';

    let variables = req.body.variables;
    if (variables === undefined) {
      if (req.query.variables) {
        try {
          variables = JSON.parse(req.query.variables);
        } catch (error) {}
      }
    }
    variables = variables || null;

    let operationName = req.body.operationName || req.query.operationName || '';
    if (!operationName && query) {
      try {
        operationName = gql(query).definitions[0].name.value;
      } catch (error) {}
    }

    for (const handler of handlers) {
      const responseHandled = handler(
        {
          body: { ...req.body, operationName, variables, query },
          params: req.params,
          query: req.query,
        },
        res,
      );

      if (responseHandled) {
        return;
      }
    }

    next();
  };
}
