import { NextFunction } from 'connect';
import cors from 'cors';
import express, { Router, Request, Response } from 'express';
import gql from 'graphql-tag';
import nunjucks from 'nunjucks';
import path from 'path';
import { transform } from 'server-with-kill';

import {
  Mock,
  Options,
  ResponseFunction,
  ResponseProps,
  Scenarios,
  MockResponse,
  Override,
  Operation,
  HttpMock,
  GraphQlMock,
  Default,
  Context,
  UpdateContext,
} from './types';

export * from './types';
export { run };

type Input = {
  default: Default;
  scenarios?: Scenarios;
  options?: Options;
};

function run({
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

  app.post(
    uiPath,
    ({ body: { scenarios: scenariosBody, button, ...rest } }, res) => {
      let updatedScenarios: string[] = [];

      if (button === 'modify') {
        updatedScenarios = groupNames
          .reduce<string[]>((result, groupName) => {
            if (rest[groupName]) {
              result.push(rest[groupName]);
            }

            return result;
          }, [])
          .concat(scenariosBody == null ? [] : scenariosBody)
          .filter(scenarioName => scenarioNames.includes(scenarioName));
      }

      updateScenarios(updatedScenarios);

      const { groups, other } = getPageVariables(
        scenarioMocks,
        updatedScenarios,
      );

      res.render('index.njk', {
        groups,
        other,
        updatedScenarios,
      });
    },
  );

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

      const scenariosByGroup: { [key: string]: number } = {};
      for (const scenario of scenariosBody) {
        if (!scenarioNames.includes(scenario)) {
          res.status(400).json({
            message: `Scenario "${scenario}" does not exist`,
          });
          return;
        }

        const scenarioMock = scenarioMocks[scenario];
        if (!Array.isArray(scenarioMock) && scenarioMock.group) {
          const { group } = scenarioMock;
          if (scenariosByGroup[group]) {
            res.status(400).json({
              message: `Scenario "${scenario}" cannot be selected, because scenario "${scenariosByGroup[group]}" from group "${group}" has already been selected`,
            });
            return;
          }

          scenariosByGroup[group] = scenario;
        }
      }

      updateScenarios(scenariosBody);

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
    selectedScenarios = updatedScenarios;

    const defaultAndScenarioMocks = [defaultMocks].concat(
      selectedScenarios.map(scenario => scenarioMocks[scenario]),
    );

    let context: Context = {};
    defaultAndScenarioMocks.forEach(scenarioMock => {
      if (!Array.isArray(scenarioMock) && scenarioMock.context) {
        context = { ...context, ...scenarioMock.context };
      }
    });

    const mocks = defaultAndScenarioMocks.reduce<Mock[]>(
      (result, scenarioMock) =>
        result.concat(
          Array.isArray(scenarioMock) ? scenarioMock : scenarioMock.mocks,
        ),
      [],
    );

    router = createRouter({ mocks, context });

    console.log('Selected scenarios', updatedScenarios);
  }
}

function addDelay(responseDelay: number) {
  return new Promise(res => setTimeout(res, responseDelay));
}

function getHttpAndGraphQlMocks(
  mocks: Mock[],
): { httpMocks: HttpMock[]; graphQlMocks: GraphQlMock[] } {
  const initialHttpMocks = mocks.filter(
    ({ method }) => method !== 'GRAPHQL',
  ) as HttpMock[];
  const initialGraphQlMocks = mocks.filter(
    ({ method }) => method === 'GRAPHQL',
  ) as GraphQlMock[];

  const httpMocksByUrlAndMethod = initialHttpMocks.reduce<
    Record<string, HttpMock>
  >((result, mock) => {
    const { url, method } = mock;
    // Always take the latest mock
    result[`${url.toString()}${method}`] = mock;

    return result;
  }, {});
  const httpMocks = Object.values(httpMocksByUrlAndMethod);

  const graphQlMocksByUrlAndOperations = initialGraphQlMocks.reduce<
    Record<string, Record<string, Operation>>
  >((result, mock) => {
    const { url, operations } = mock;

    const operationsByName: Record<string, Operation> = result[url]
      ? result[url]
      : {};

    operations.forEach(operation => {
      // Always take the latest operation
      operationsByName[operation.name] = operation;
    });

    result[url] = operationsByName;
    return result;
  }, {});
  const graphQlMocks = Object.entries(graphQlMocksByUrlAndOperations).map(
    ([url, operationsByName]) => ({
      method: 'GRAPHQL',
      url,
      operations: Object.values(operationsByName),
    }),
  ) as GraphQlMock[];

  return { httpMocks, graphQlMocks };
}

function createRouter({
  mocks,
  context: initialContext,
}: {
  mocks: Mock[];
  context: Context;
}) {
  let context = initialContext;
  const router = Router();

  const { httpMocks, graphQlMocks } = getHttpAndGraphQlMocks(mocks);

  httpMocks.forEach(httpMock => {
    const { method, url, ...rest } = httpMock;

    const handler = createHandler({
      ...rest,
      updateContext,
    });

    switch (httpMock.method) {
      case 'GET':
        router.get(url, (req, res) => {
          handler({ ...req, context }, res);
        });
        break;
      case 'POST':
        router.post(url, (req, res) => {
          handler({ ...req, context }, res);
        });
        break;
      case 'PUT':
        router.put(url, (req, res) => {
          handler({ ...req, context }, res);
        });
        break;
      case 'DELETE':
        router.delete(url, (req, res) => {
          handler({ ...req, context }, res);
        });
        break;
      default:
        throw new Error(
          `Unrecognised HTTP method ${method} - please check your mock configuration`,
        );
    }
  });

  const graphQlUrlToHandlers = graphQlMocks.reduce<
    Record<
      string,
      {
        queries: GraphQlHandler[];
        mutations: GraphQlHandler[];
      }
    >
  >((result, { url, operations }) => {
    const queries = operations
      .filter(({ type }) => type === 'query')
      .map(operation =>
        createGraphQlHandler({ ...operation, updateContext, getContext }),
      );
    const mutations = operations
      .filter(({ type }) => type === 'mutation')
      .map(operation =>
        createGraphQlHandler({ ...operation, updateContext, getContext }),
      );

    const queriesAndMutations = result[url]
      ? result[url]
      : { queries: [], mutations: [] };

    queriesAndMutations.queries = queriesAndMutations.queries.concat(queries);
    queriesAndMutations.mutations = queriesAndMutations.mutations.concat(
      mutations,
    );

    result[url] = queriesAndMutations;

    return result;
  }, {});

  Object.entries(graphQlUrlToHandlers).forEach(
    ([url, { queries, mutations }]) => {
      router.get(url, createGraphQlRequestHandler(queries));
      router.post(url, createGraphQlRequestHandler(queries.concat(mutations)));
    },
  );

  return router;

  function updateContext(partialContext: Context) {
    context = { ...context, ...partialContext };

    return context;
  }

  function getContext() {
    return context;
  }
}

type Groups = Array<{
  name: string;
  noneChecked: boolean;
  scenarios: Array<{
    name: string;
    checked: boolean;
  }>;
}>;

function getPageVariables(
  scenarioMocks: Scenarios,
  selectedScenarios: string[],
) {
  const { other, ...groupedScenarios } = Object.entries(scenarioMocks).reduce<{
    other: string[];
    [key: string]: string[];
  }>(
    (result, [scenarioName, scenarioMock]) => {
      if (Array.isArray(scenarioMock) || scenarioMock.group == null) {
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

type GraphQlHandler = (
  req: {
    body: Request['body'] & {
      operationName: string;
      variables: Record<string, any>;
      query: string;
    };
    params: Request['params'];
    query: Request['query'];
  },
  res: Response,
) => boolean;

function createGraphQlHandler({
  name: operationNameToCheck,
  getContext,
  ...rest
}: Operation & {
  updateContext: UpdateContext;
  getContext: () => Context;
}) {
  const handler = createHandler(rest);

  const graphQlHandler: GraphQlHandler = (req, res) => {
    if (operationNameToCheck === req.body.operationName) {
      handler(
        {
          operationName: req.body.operationName,
          query: req.body.query,
          variables: req.body.variables,
          context: getContext(),
        },
        res,
      );

      return true;
    }

    return false;
  };

  return graphQlHandler;
}

function createHandler<TInput, TResponse>({
  response,
  responseCode = 200,
  responseHeaders,
  responseDelay = 0,
  updateContext,
}: ResponseProps<MockResponse<TInput, TResponse>> & {
  updateContext: UpdateContext;
}) {
  return async (req: TInput, res: Response) => {
    const actualResponse =
      typeof response === 'function'
        ? await ((response as unknown) as ResponseFunction<TInput, TResponse>)({
            ...req,
            updateContext,
          })
        : response;

    let responseCollection: {
      response?: any;
      responseDelay: number;
      responseHeaders?: Record<string, string>;
      responseCode: number;
    } = {
      responseDelay,
      responseHeaders,
      responseCode,
    };
    if (
      actualResponse !== null &&
      typeof actualResponse === 'object' &&
      (actualResponse as Override<TResponse>).__override &&
      Object.keys(actualResponse).length === 1
    ) {
      responseCollection = {
        ...responseCollection,
        ...(actualResponse as Override<TResponse>).__override,
      };
    } else {
      responseCollection.response = actualResponse;
    }

    await addDelay(responseCollection.responseDelay);

    if (
      responseCollection.response !== undefined &&
      (!responseCollection.responseHeaders ||
        !responseCollection.responseHeaders['Content-Type'])
    ) {
      responseCollection.responseHeaders = {
        ...responseCollection.responseHeaders,
        'Content-Type': 'application/json',
      };
    }

    if (
      responseCollection.responseHeaders &&
      responseCollection.responseHeaders['Content-Type'] === 'application/json'
    ) {
      responseCollection.response = JSON.stringify(responseCollection.response);
    }

    res
      .set(responseCollection.responseHeaders)
      .status(responseCollection.responseCode)
      .send(responseCollection.response);
  };
}

function createGraphQlRequestHandler(handlers: GraphQlHandler[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const query =
      req.headers['content-type'] === 'application/graphql'
        ? req.body
        : req.body.query || req.query.query || '';

    let graphqlAst;
    try {
      graphqlAst = gql(query);
    } catch (error) {
      res.status(400).json({
        message: `query "${query}" is not a valid GraphQL query`,
      });
      return;
    }

    let variables = req.body.variables;
    if (variables === undefined && req.query.variables) {
      try {
        variables = JSON.parse(req.query.variables);
      } catch (error) {}
    }
    variables = variables || {};

    let operationName = req.body.operationName || req.query.operationName || '';
    if (!operationName && query) {
      try {
        operationName = graphqlAst.definitions[0].name.value;
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
