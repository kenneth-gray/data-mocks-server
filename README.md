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
  - [HttpMock](#httpmock)
  - [HttpResponseFunction](#httpresponsefunction)
  - [GraphqlMock](#graphqlmock)
    - [Operation](#operation)
  - [GraphqlResponseFunction](#graphqlresponsefunction)

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

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property     | Type          | Default    | Description                                                                            |
|--------------|---------------|------------|----------------------------------------------------------------------------------------|
| scenarioName | `string`      | _required_ | Name of scenario.                                                                      |
| Mock         | `Mock`        | _required_ | See [Mock](#mock) for more details.                                                    |
| group        | `string`      | _required_ | Used to group scenarios together so that only one scenario in a group can be selected. |
| mocks        | `Array<Mock>` | _required_ | See [Mock](#mock) for more details.                                                    |             |

#### options

> `{ port, uiPath, modifyScenariosPath, resetScenariosPath }` | defaults to `{}`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property            | Type     | Default             | Description                                                                      |
|---------------------|----------|---------------------|----------------------------------------------------------------------------------|
| port                | `number` | `3000`              | Port that the http server runs on.                                               |
| uiPath              | `string` | `/`                 | Path that the UI will load on. `http://localhost:{port}{uiPath}`                 |
| modifyScenariosPath | `string` | `/modify-scenarios` | API path for modifying scenarios. `http://localhost:{port}{modifyScenariosPath}` |
| resetScenariosPath  | `string` | `/reset-scenarios`  | API path for resetting scenarios. `http://localhost:{port}{resetScenariosPath}`  |

## Types

### Mock

> `HttpMock | GraphqlMock`

### HttpMock

> `{ url, method, response, responseCode, responseHeaders, delay }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property        | Type                                         | Default     | Description                                                                                                                        |
|-----------------|----------------------------------------------|-------------|------------------------------------------------------------------------------------------------------------------------------------|
| url             | `string` / `RegExp`                          | _required_  | Path of endpoint.                                                                                                                  |
| method          | `GET` / `POST` / `PUT` / `DELETE`            | _required_  | HTTP method of endpoint.                                                                                                           |
| response        | `string` / `object` / `HttpResponseFunction` | _required_  | `string` and `object` will be json responses for the endpoint. See [HttpResponseFunction](#httpresponsefunction) for more details. |
| responseCode    | `number`                                     | `200`       | HTTP status code for response. Unused when `response` is a `ResponseFunction`.                                                     |
| responseHeaders | `object` / `undefined`                       | `undefined` | Key/value pairs of HTTP headers for response. Unused when `response` is a `ResponseFunction`.                                      |
| delay           | `number`                                     | `0`         | Number of milliseconds before the response is returned. Unused when `response` is a `ResponseFunction`.                            |

### HttpResponseFunction

> `function({ query, body, params }): Promise<{ response, responseCode, responseHeaders }>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property        | Type                   | Default     | Description                                   |
|-----------------|------------------------|-------------|-----------------------------------------------|
| query           | `object`               | {}          | query object as defined by `express`.         |
| body            | `object`               | {}          | body object as defined by `express`.          |
| params          | `object`               | {}          | params object as defined by `express`.        |
| response        | `string` / `object`    | _required_  | JSON response.                                |
| responseCode    | `number`               | `200`       | HTTP status code for response.                |
| responseHeaders | `object` / `undefined` | `undefined` | Key/value pairs of HTTP headers for response. |

### GraphqlMock

> `{ url, method, operations }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property   | Type               | Default    | Description                                                                            |
|------------|--------------------|------------|----------------------------------------------------------------------------------------|
| url        | `string`           | _required_ | Path of endpoint.                                                                      |
| method     | `GRAPHQL`          | _required_ | Indentifies this mock as a GraphqlMock.                                                |
| operations | `Array<Operation>` | _required_ | List of operations for graphql endpoint. See [Operation](#operation) for more details. |

#### Operation

> `{ type, operationName, response, responseCode, responseHeaders, delay }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property        | Type                                                           | Default     | Description                                                                                             |
|-----------------|----------------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------------------|
| type            | `query` / `mutation`                                           | _required_  | Tyoe of operation.                                                                                      |
| operationName   | `string`                                                       | _required_  | Name of operation.                                                                                      |
| response        | `{ data: object, errors?: array }` / `GraphqlResponseFunction` | _required_  | See [GraphqlResponseFunction](#grapqlresponsefunction) for more details.                                |
| responseCode    | `number`                                                       | `200`       | HTTP status code for response. Unused when `response` is a `ResponseFunction`.                          |
| responseHeaders | `object` / `undefined`                                         | `undefined` | Key/value pairs of HTTP headers for response. Unused when `response` is a `ResponseFunction`.           |
| delay           | `number`                                                       | `0`         | Number of milliseconds before the response is returned. Unused when `response` is a `ResponseFunction`. |

### GraphqlResponseFunction

> `function({ operationName, query, variables }): Promise<{ response, responseCode, responseHeaders }>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property        | Type                                          | Default     | Description                                                                                                                                 |
|-----------------|-----------------------------------------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| operationName   | `string`                                      | ''          | operationName sent by client.                                                                                                               |
| query           | `string`                                      | ''          | GraphQL query                                                                                                                               |
| variables       | `null` / `object`                             | null        | variables sent by client.                                                                                                                   |
| response        | `{ data: object, errors?: array }` / `object` | _required_  | Standard GraphQL JSON response. `object` should only be used when combined with a 5XX `responseCode` to simulate an HTTP transport failure. |
| responseCode    | `number`                                      | `200`       | HTTP status code for response.                                                                                                              |
| responseHeaders | `object` / `undefined`                        | `undefined` | Key/value pairs of HTTP headers for response.                                                                                               |
