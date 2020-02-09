import { Router, Request, Response, NextFunction } from 'express';
import gql from 'graphql-tag';

import { createHandler } from './create-handler';
import { GraphQlMock, Operation, Mock, UpdateContext, Context } from './types';

export { getGraphQlMocks, applyGraphQlRoutes };

type GraphQlHandler = (
  req: {
    operationType: 'query' | 'mutation';
    operationName: string;
    variables: Record<string, any>;
    query: string;
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

    const operationsByNameAndType: Record<string, Operation> = result[url]
      ? result[url]
      : {};

    operations.forEach(operation => {
      // Always take the latest operation
      operationsByNameAndType[`${operation.name}${operation.type}`] = operation;
    });

    result[url] = operationsByNameAndType;
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
  type: operationTypeToCheck,
  ...rest
}: Operation & {
  updateContext: UpdateContext;
  getContext: () => Context;
}): GraphQlHandler {
  const handler = createHandler(rest);

  return ({ operationName, query, variables, operationType }, res) => {
    if (
      operationNameToCheck === operationName &&
      operationTypeToCheck === operationType
    ) {
      handler(
        {
          operationName,
          query,
          variables,
        },
        res,
      );

      return true;
    }

    return false;
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

    const operationType = graphqlAst.definitions[0].operation;

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
          operationName,
          variables,
          query,
          operationType,
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
