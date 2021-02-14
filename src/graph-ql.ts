import { Request, Response, NextFunction } from 'express';
import gql from 'graphql-tag';

import { createHandler } from './create-handler';
import {
  GraphQlMock,
  Operation,
  Mock,
  UpdateContext,
  GetContext,
} from './types';

export { getGraphQlMocks, getGraphQlMock, createGraphQlRequestHandler };

type GraphQlHandler = (
  req: {
    operationType: 'query' | 'mutation';
    operationName: string;
    variables: Record<string, any>;
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

function createGraphQlHandler({
  name: operationNameToCheck,
  type: operationTypeToCheck,
  ...rest
}: Operation & {
  updateContext: UpdateContext;
  getContext: GetContext;
}): GraphQlHandler {
  const handler = createHandler(rest);

  return ({ operationType, operationName, variables }, res) => {
    if (
      operationType === operationTypeToCheck &&
      operationName === operationNameToCheck
    ) {
      handler(
        {
          variables,
        },
        res,
      );

      return true;
    }

    return false;
  };
}

function createInternalGraphQlRequestHandler(handlers: GraphQlHandler[]) {
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

    const operationTypesAndNames = (graphqlAst.definitions as Array<{
      kind: string;
      operation: 'query' | 'mutation';
      name?: { value: string };
    }>)
      .filter(({ kind }) => kind === 'OperationDefinition')
      .map(({ operation, name }) => ({
        type: operation,
        name: name && name.value,
      }));

    if (
      operationTypesAndNames.length > 1 &&
      !req.body.operationName &&
      !req.query.operationName
    ) {
      res.status(400).json({
        message: `query "${query}" is not a valid GraphQL query`,
      });
      return;
    }

    const operationName: string =
      req.body.operationName ||
      req.query.operationName ||
      operationTypesAndNames[0].name ||
      '';

    const operationTypeAndName = operationTypesAndNames.find(
      ({ name }) => name === operationName,
    );

    if (!operationTypeAndName) {
      res.status(400).json({
        message: `operation name "${operationName}" does not exist in GraphQL query`,
      });
      return;
    }

    const operationType = operationTypeAndName.type;

    let variables = req.body.variables;
    if (variables === undefined && req.query.variables) {
      try {
        variables = JSON.parse(req.query.variables);
      } catch (error) {}
    }
    variables = variables || {};

    for (const handler of handlers) {
      const responseHandled = handler(
        {
          operationType,
          operationName,
          variables,
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

function getGraphQlMock(req: Request, graphqlMocks: GraphQlMock[]) {
  return graphqlMocks.find(graphQlMock => graphQlMock.url === req.path) || null;
}

function getQueries({
  graphQlMock,
  updateContext,
  getContext,
}: {
  graphQlMock: GraphQlMock;
  updateContext: UpdateContext;
  getContext: GetContext;
}) {
  return graphQlMock.operations
    .filter(({ type }) => type === 'query')
    .map(operation =>
      createGraphQlHandler({
        ...operation,
        updateContext,
        getContext,
      }),
    );
}

function getMutations({
  graphQlMock,
  updateContext,
  getContext,
}: {
  graphQlMock: GraphQlMock;
  updateContext: UpdateContext;
  getContext: GetContext;
}) {
  return graphQlMock.operations
    .filter(({ type }) => type === 'mutation')
    .map(operation =>
      createGraphQlHandler({
        ...operation,
        updateContext,
        getContext,
      }),
    );
}

function createGraphQlRequestHandler({
  graphQlMock,
  updateContext,
  getContext,
}: {
  graphQlMock: GraphQlMock;
  updateContext: UpdateContext;
  getContext: GetContext;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      const queries = getQueries({
        graphQlMock,
        updateContext,
        getContext,
      });

      const requestHandler = createInternalGraphQlRequestHandler(queries);
      requestHandler(req, res, next);

      return;
    }

    if (req.method === 'POST') {
      const queries = getQueries({
        graphQlMock,
        updateContext,
        getContext,
      });
      const mutations = getMutations({
        graphQlMock,
        updateContext,
        getContext,
      });
      const requestHandler = createInternalGraphQlRequestHandler(
        queries.concat(mutations),
      );
      requestHandler(req, res, next);

      return;
    }

    // req.method doesn't make sense for GraphQL - default 404 from express
    next();
  };
}
