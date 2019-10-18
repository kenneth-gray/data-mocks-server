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
      response: async ({ query, params }) => {
        return {
          response: {
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
          response: {
            body,
            params,
          },
        };
      },
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
  },
});
