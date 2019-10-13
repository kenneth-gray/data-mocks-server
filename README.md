# Data Mocks Server

This package is a version of https://github.com/ovotech/data-mocks that prefers spinning up an express server instead of mocking out `fetch` and `XHR` operations. Thanks goes to [grug](https://github.com/grug) for his implementation.

## Installation

```
npm install data-mocks-server
```

## Example usage

```javascript
const { run } = require('data-mocks-server');

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
```

Calls to `http://localhost:3000/api/test-me` will start by returning `{ blue: 'cheese' }`.

Visiting `http://localhost:3000` will allow you to `Change scenario` to `cheese`. Afterwards, calls to `http://localhost:3000/api/test-me` will return `{ blue: 'yoyo' }`.

The port the server listens on can be changed by passing in an options object to `run`.
