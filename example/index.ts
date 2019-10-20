import { run } from '../src';

run({
  default: [
    {
      url: '/api/test-me',
      method: 'GET',
      response: { blue: 'yoyo' },
    },
    {
      url: '/api/return/:someId',
      method: 'GET',
      response: ({ query, params }) => {
        return {
          query,
          params,
        };
      },
    },
    {
      url: '/api/return/:someId',
      method: 'POST',
      response: async ({ body, params }) => {
        return {
          body,
          params,
        };
      },
    },
    {
      url: '/api/graphql',
      method: 'GRAPHQL',
      operations: [
        {
          type: 'query',
          operationName: 'Cheese',
          response: {
            data: {
              name: 'Cheddar',
            },
          },
        },
        {
          type: 'query',
          operationName: 'Bread',
          response: {
            data: {
              name: 'Bread Roll',
            },
          },
        },
      ],
    },
    {
      url: '/api/graphql-function',
      method: 'GRAPHQL',
      operations: [
        {
          type: 'query',
          operationName: 'Function',
          response: async ({ operationName, query, variables }) => {
            return {
              data: {
                operationName,
                query,
                variables,
              },
            };
          },
        },
      ],
    },
  ],
  scenarios: {
    blueCheese: {
      group: 'cheese',
      mocks: [
        {
          url: '/api/test-me',
          method: 'GET',
          response: { blue: 'cheese' },
        },
        {
          url: '/api/graphql',
          method: 'GRAPHQL',
          operations: [
            {
              type: 'query',
              operationName: 'Cheese',
              response: {
                data: {
                  name: 'Blue Cheese',
                },
              },
            },
          ],
        },
      ],
    },
    redCheese: {
      group: 'cheese',
      mocks: [
        {
          url: '/api/test-me',
          method: 'GET',
          response: { red: 'leicester' },
        },
        {
          url: '/api/graphql',
          method: 'GRAPHQL',
          operations: [
            {
              type: 'query',
              operationName: 'Cheese',
              response: {
                data: {
                  name: 'Red Leicester',
                },
              },
            },
          ],
        },
      ],
    },
    tigerBread: {
      group: 'bread',
      mocks: [],
    },
    baguette: {
      group: 'bread',
      mocks: [],
    },
    fish: [
      {
        url: '/api/test-me-2',
        method: 'GET',
        response: { blue: 'tang' },
      },
    ],
    water: [],
  },
  options: {
    port: 5000,
    uiPath: '/scenarios',
    modifyScenariosPath: '/modify',
    resetScenariosPath: '/reset',
  },
});
