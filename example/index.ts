import { run } from '../src';

run({
  default: [
    {
      url: '/api/test-me',
      method: 'GET',
      response: { blue: 'cheese' },
    },
  ],
  cheese: [
    {
      url: '/api/test-me',
      method: 'GET',
      response: { blue: 'yoyo' },
    },
  ],
});
