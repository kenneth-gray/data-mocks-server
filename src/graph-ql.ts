import { Router, Request, Response, NextFunction } from 'express';
import gql from 'graphql-tag';

import { createHandler } from './create-handler';
import { GraphQlMock, Operation, Mock, UpdateContext, Context } from './types';

export { getGraphQlMocks, applyGraphQlRoutes };

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

function getGraphQlMocks(mocks: Mock[]) {
  const initialGraphQlMocks = mocks.filter(
    ({ method }) => method === 'GRAPHQL',
  ) as GraphQlMock[];

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

  return Object.entries(graphQlMocksByUrlAndOperations).map(
    ([url, operationsByName]) => ({
      method: 'GRAPHQL',
      url,
      operations: Object.values(operationsByName),
    }),
  ) as GraphQlMock[];
}

function applyGraphQlRoutes({
  router,
  graphQlMocks,
  getContext,
  updateContext,
}: {
  router: Router;
  graphQlMocks: GraphQlMock[];
  getContext: () => Context;
  updateContext: UpdateContext;
}) {
  graphQlMocks.forEach(({ url, operations }) => {
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

    router.get(url, createGraphQlRequestHandler(queries));
    router.post(url, createGraphQlRequestHandler(queries.concat(mutations)));
  });
}

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
