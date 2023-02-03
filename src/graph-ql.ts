import gql from 'graphql-tag';

import { createHandler } from './create-handler';
import {
  GraphQlMock,
  Operation,
  Mock,
  UpdateContext,
  GetContext,
  InternalRequest,
  Result,
} from './types';

export { getGraphQlMocks, getGraphQlMock, createGraphQlRequestHandler };

type GraphQlHandler = (req: {
  operationType: 'query' | 'mutation';
  operationName: string;
  variables: Record<string, any>;
}) => Promise<null | Result>;

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

  return async ({ operationType, operationName, variables }) => {
    if (
      operationType === operationTypeToCheck &&
      operationName === operationNameToCheck
    ) {
      const result = await handler({
        variables,
      });

      return result;
    }

    return null;
  };
}

function createInternalGraphQlRequestHandler(handlers: GraphQlHandler[]) {
  return async (req: InternalRequest) => {
    const query =
      req.headers['content-type'] === 'application/graphql'
        ? req.body
        : req.body.query || req.query.query || '';

    let graphqlAst;
    try {
      graphqlAst = gql(query);
    } catch (error) {
      const result = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        response: { message: `query "${query}" is not a valid GraphQL query` },
      };

      return result;
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
      const result = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        response: {
          message: `query "${query}" is not a valid GraphQL query`,
        },
      };

      return result;
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
      const result = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        response: {
          message: `operation name "${operationName}" does not exist in GraphQL query`,
        },
      };

      return result;
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
      const result = await handler({
        operationType,
        operationName,
        variables,
      });

      if (result) {
        return result;
      }
    }

    return { status: 404 };
  };
}

function getGraphQlMock(path: string, graphqlMocks: GraphQlMock[]) {
  return graphqlMocks.find(graphQlMock => graphQlMock.url === path) || null;
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
}): (req: InternalRequest) => Promise<Result> {
  return req => {
    if (req.method === 'GET') {
      const queries = getQueries({
        graphQlMock,
        updateContext,
        getContext,
      });

      const requestHandler = createInternalGraphQlRequestHandler(queries);

      return requestHandler(req);
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

      return requestHandler(req);
    }

    return Promise.resolve({ status: 404 });
  };
}
