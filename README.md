# Data Mocks Server

This package was originally a port of https://github.com/ovotech/data-mocks that prefers spinning up an express server instead of mocking out `fetch` and `XHR` operations. Thanks goes to [grug](https://github.com/grug) for his idea and implementation.

## Table of contents

- [Installation](#installation)
- [Example usage](#example-usage)
- [API](#api)
  - [run](#run)
    - [default](#default)
    - [scenarios](#scenarios)
    - [options](#options)
- [Types](#types)
  - [Mock](#mock)
  - [ResponseFunction](#responsefunction)

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
  },
});
```

Calls to `http://localhost:3000/api/test-me` will start by returning `{ blue: 'yoyo' }`.

Visiting `http://localhost:3000` will allow you to `Modify scenarios`. The default response will always be included unless a scenario overrides it. In this case enabling `cheese` will modify `/api/test-me` so that it returns `{ blue: 'cheese' }`.

## API

### run

> `function({ default, scenarios, options })`

#### default

> `Array<Mock>` | _required_

See [Mock](#mock) for more details.

#### scenarios

> `{ [scenarioName]: Array<Mock | { group, mocks }> }`

| Property     | Type          | Default    | Description                                                                            |
|--------------|---------------|------------|----------------------------------------------------------------------------------------|
| scenarioName | `string`      | _required_ | Name of scenario.                                                                      |
| Mock         | `object`      | _required_ | See [Mock](#mock) for more details.                                                    |
| group        | `string`      | _required_ | Used to group scenarios together so that only one scenario in a group can be selected. |
| mocks        | `Array<Mock>` | _required_ | See [Mock](#mock) for more details.                                                    |

#### options

> `{ port, uiPath, modifyScenariosPath, resetScenariosPath }` | defaults to `{}`

| Property            | Type     | Default             | Description                                                                      |
|---------------------|----------|---------------------|----------------------------------------------------------------------------------|
| port                | `number` | `3000`              | Port that the http server runs on.                                               |
| uiPath              | `string` | `/`                 | Path that the UI will load on. `http://localhost:{port}{uiPath}`                 |
| modifyScenariosPath | `string` | `/modify-scenarios` | API path for modifying scenarios. `http://localhost:{port}{modifyScenariosPath}` |
| resetScenariosPath  | `string` | `/reset-scenarios`  | API path for resetting scenarios. `http://localhost:{port}{resetScenariosPath}`  |

## Types

### Mock

> `{ url, method, response, responseCode, responseHeaders, delay }`

| Property        | Type                                     | Default     | Description                                                                                                                |
|-----------------|------------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------|
| url             | `string` / `RegExp`                      | _required_  | Path of endpoint.                                                                                                          |
| method          | `GET` / `POST` / `PUT` / `DELETE`        | _required_  | HTTP method of endpoint.                                                                                                   |
| response        | `string` / `object` / `ResponseFunction` | _required_  | `string` and `object` will be json responses for the endpoint. See [ResponseFunction](#responsefunction) for more details. |
| responseCode    | `number`                                 | `200`       | HTTP status code for response. Unused when `response` is a `ResponseFunction`.                                             |
| responseHeaders | `object` / `undefined`                   | `undefined` | Key/value pairs of HTTP headers for response. Unused when `response` is a `ResponseFunction`.                              |
| delay           | `number`                                 | `0`         | Number of milliseconds before the response is returned. Unused when `response` is a `ResponseFunction`.                    |

### ResponseFunction

> `function({ query, body, params }): Promise<{ response, responseCode, responseHeaders }>`

| Property        | Type                   | Default     | Description                                   |
|-----------------|------------------------|-------------|-----------------------------------------------|
| query           | `object`               | {}          | query object as defined by `express`.         |
| body            | `object`               | {}          | body object as defined by `express`.          |
| params          | `object`               | {}          | params object as defined by `express`.        |
| response        | `string` / `object`    | _required_  | JSON response.                                |
| responseCode    | `number`               | `200`       | HTTP status code for response.                |
| responseHeaders | `object` / `undefined` | `undefined` | Key/value pairs of HTTP headers for response. |
