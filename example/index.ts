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
    cheese: [
      {
        url: '/api/test-me',
        method: 'GET',
        response: { blue: 'cheese' },
      },
    ],
    fish: [
      {
        url: '/api/test-me-2',
        method: 'GET',
        response: { blue: 'tang' },
      },
    ],
  },
});
