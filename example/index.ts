import { run } from '../src';

run({
  default: {
    context: {
      a: 1,
      b: 2,
      c: 3,
    },
    mocks: [
      {
        url: '/api/test-me',
        method: 'GET',
        response: { data: { blue: 'yoyo' } },
      },
      {
        url: '/api/return/:someId',
        method: 'GET',
        response: ({ query, params }) => {
          return {
            data: {
              query,
              params,
            },
          };
        },
      },
      {
        url: '/api/return/:someId',
        method: 'POST',
        response: async ({ body, params }) => {
          return {
            data: {
              body,
              params,
            },
          };
        },
      },
      {
        url: '/api/graphql',
        method: 'GRAPHQL',
        operations: [
          {
            type: 'query',
            name: 'Cheese',
            response: {
              data: {
                data: {
                  name: 'Cheddar',
                },
              },
            },
          },
          {
            type: 'query',
            name: 'Bread',
            response: {
              data: {
                data: {
                  name: 'Bread Roll',
                },
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
            name: 'Function',
            response: async ({ variables }) => {
              return {
                data: {
                  data: {
                    variables,
                  },
                },
              };
            },
          },
        ],
      },
      {
        url: '/api/context',
        method: 'GET',
        response: ({ context }) => ({ data: context }),
      },
      {
        url: '/api/context',
        method: 'PUT',
        response: ({ body, updateContext }) => ({ data: updateContext(body) }),
      },
    ],
  },
  scenarios: {
    blueCheese: {
      group: 'cheese',
      mocks: [
        {
          url: '/api/test-me',
          method: 'GET',
          response: { data: { blue: 'cheese' } },
        },
        {
          url: '/api/graphql',
          method: 'GRAPHQL',
          operations: [
            {
              type: 'query',
              name: 'Cheese',
              response: {
                data: {
                  data: {
                    name: 'Blue Cheese',
                  },
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
          response: { data: { red: 'leicester' } },
        },
        {
          url: '/api/graphql',
          method: 'GRAPHQL',
          operations: [
            {
              type: 'query',
              name: 'Cheese',
              response: {
                data: {
                  data: {
                    name: 'Red Leicester',
                  },
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
        response: { data: { blue: 'tang' } },
      },
    ],
    water: [],
  },
  options: {
    port: 5000,
    uiPath: '/scenarios-ui',
    modifyScenariosPath: '/modify',
    resetScenariosPath: '/reset',
    cookieMode: true,
  },
});
