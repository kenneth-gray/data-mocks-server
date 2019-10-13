import { run } from '../src';

run({
  default: [
    {
      url: '/api/test-me',
      method: 'GET',
      response: { blue: 'yoyo' },
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
