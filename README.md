# [Deprecated]

This project is now deprecated in favour of [Scenario Mock Server](https://github.com/kenneth-gray/scenario-mock-server)

# Data Mocks Server

This package was originally a port of https://github.com/ovotech/data-mocks that prefers spinning up an express server instead of mocking out `fetch` and `XHR` operations. Thanks goes to [grug](https://github.com/grug) for his idea and implementation.

## Table of contents

- [Data Mocks Server](#data-mocks-server)
  - [Table of contents](#table-of-contents)
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
    - [Response](#response)
    - [HttpResponseFunction](#httpresponsefunction)
    - [GraphQlMock](#graphqlmock)
      - [Operation](#operation)
    - [GraphQlResponse](#graphqlresponse)
    - [GraphQlResponseFunction](#graphqlresponsefunction)
    - [Override](#override)

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
      response: { data: { blue: 'yoyo' } },
    },
  ],
  scenarios: {
    cheese: [
      {
        url: '/api/test-me',
        method: 'GET',
        response: { data: { blue: 'cheese' } },
      },
    ],
  },
});
```

Calls to `http://localhost:3000/api/test-me` will start by returning `{ blue: 'yoyo' }`.

Visiting `http://localhost:3000` will allow you to `Modify scenarios`. The default response will always be included unless a scenario overrides it. In this case enabling `cheese` will modify `/api/test-me` so that it returns `{ blue: 'cheese' }`.

## API

### createExpressApp

Returns the internal express instance

> `function({ default, scenarios, options })`

### run

Returns an http server, with an additional kill method

> `function({ default, scenarios, options })`

#### default

> `Array<Mock> | { context, mocks }` | _required_

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type          | Default     | Description                           |
| -------- | ------------- | ----------- | ------------------------------------- |
| context  | `object`      | `undefined` | Used to set up data across API calls. |
| mocks    | `Array<Mock>` | _required_  | See [Mock](#mock) for more details.   |

#### scenarios

> `{ [scenarioName]: Array<Mock> | { group, mocks } }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property     | Type          | Default     | Description                                                                            |
| ------------ | ------------- | ----------- | -------------------------------------------------------------------------------------- |
| scenarioName | `string`      | _required_  | Name of scenario.                                                                      |
| Mock         | `Mock`        | _required_  | See [Mock](#mock) for more details.                                                    |
| group        | `string`      | `undefined` | Used to group scenarios together so that only one scenario in a group can be selected. |
| context      | `object`      | `undefined` | Used to set up data across API calls.                                                  |
| mocks        | `Array<Mock>` | _required_  | See [Mock](#mock) for more details.                                                    |

#### options

> `{ port, uiPath, modifyScenariosPath, resetScenariosPath, scenariosPath }` | defaults to `{}`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property            | Type      | Default             | Description                                                                                |
| ------------------- | --------- | ------------------- | ------------------------------------------------------------------------------------------ |
| port                | `number`  | `3000`              | Port that the http server runs on.                                                         |
| uiPath              | `string`  | `/`                 | Path that the UI will load on. `http://localhost:{port}{uiPath}`                           |
| modifyScenariosPath | `string`  | `/modify-scenarios` | API path for modifying scenarios. `http://localhost:{port}{modifyScenariosPath}`           |
| resetScenariosPath  | `string`  | `/reset-scenarios`  | API path for resetting scenarios. `http://localhost:{port}{resetScenariosPath}`            |
| scenariosPath       | `string`  | `/scenarios`        | API path for getting scenarios. `http://localhost:{port}{scenariosPath}`                   |
| cookieMode          | `boolean` | `false`             | Whether or not to store scenario selections in a cookie rather than directly in the server |

## Types

### Mock

> `HttpMock | GraphQlMock`

See [HttpMock](#httpmock) and [GraphQlMock](#graphqlmock) for more details.

### HttpMock

> `{ url, method, response }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type                                                  | Default     | Description                                                           |
| -------- | ----------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| url      | `string` / `RegExp`                                   | _required_  | Path of endpoint. Must start with `/`.                                |
| method   | `'GET'` / `'POST'` / `'PUT'` / `'DELETE'` / `'PATCH'` | _required_  | HTTP method of endpoint.                                              |
| response | `undefined` / `Response` / `HttpResponseFunction`     | `undefined` | [Response](#response), [HttpResponseFunction](#httpresponsefunction). |

### Response

> `{ status, headers, data, delay }`

| Property | Type                         | Default         | Description                                                                                                                                                                                                        |
| -------- | ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status   | `number`                     | `200`           | HTTP status code for response.                                                                                                                                                                                     |
| headers  | `object` / `undefined`       | See description | Key/value pairs of HTTP headers for response. Defaults to `undefined` when response is `undefined`, adds `'Content-Type': 'application/json'` when response is not `undefined` and `Content-Type` is not supplied. |
| data     | `null` / `string` / `object` | `undefined`     | Response data                                                                                                                                                                                                      |
| delay    | `number`                     | `0`             | Number of milliseconds before the response is returned.                                                                                                                                                            |

### HttpResponseFunction

> `function({ query, body, params, context, updateContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property      | Type                     | Default                            | Description                                                                                                       |
| ------------- | ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| query         | `object`                 | `{}`                               | query object as defined by `express`.                                                                             |
| body          | `object`                 | `{}`                               | body object as defined by `express`.                                                                              |
| params        | `object`                 | `{}`                               | params object as defined by `express`.                                                                            |
| context       | `object`                 | `{}`                               | Data stored across API calls.                                                                                     |
| updateContext | `Function`               | `partialContext => updatedContext` | Used to update context. `partialContext` can either be an `object` or a function (`context` => `partialContext`). |
| response      | `undefined` / `Response` | _required_                         | [Response](#response).                                                                                            |

### GraphQlMock

> `{ url, method, operations }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property   | Type               | Default    | Description                                                                            |
| ---------- | ------------------ | ---------- | -------------------------------------------------------------------------------------- |
| url        | `string`           | _required_ | Path of endpoint.                                                                      |
| method     | `'GRAPHQL'`        | _required_ | Indentifies this mock as a GraphQlMock.                                                |
| operations | `Array<Operation>` | _required_ | List of operations for GraphQL endpoint. See [Operation](#operation) for more details. |

#### Operation

> `{ type, name, response }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type                                                        | Default     | Description                                                                               |
| -------- | ----------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| type     | `'query'` / `'mutation'`                                    | _required_  | Type of operation.                                                                        |
| name     | `string`                                                    | _required_  | Name of operation.                                                                        |
| response | `undefined` / `GraphQlResponse` / `GraphQlResponseFunction` | `undefined` | [GraphQlResponse](#graphqlresponse), [GraphQlResponseFunction](#graphqlresponsefunction). |

### GraphQlResponse

> `{ status, headers, data, delay }`

| Property | Type                                       | Default         | Description                                                                                                                                                                                                        |
| -------- | ------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status   | `number`                                   | `200`           | HTTP status code for response.                                                                                                                                                                                     |
| headers  | `object` / `undefined`                     | See description | Key/value pairs of HTTP headers for response. Defaults to `undefined` when response is `undefined`, adds `'Content-Type': 'application/json'` when response is not `undefined` and `Content-Type` is not supplied. |
| data     | `{ data?: null / object, errors?: array }` | `undefined`     | Response data                                                                                                                                                                                                      |
| delay    | `number`                                   | `0`             | Number of milliseconds before the response is returned.                                                                                                                                                            |

### GraphQlResponseFunction

> `function({ variables, context, updateContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property      | Type                            | Default                            | Description                                                                                                       |
| ------------- | ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| variables     | `object`                        | `{}`                               | variables sent by client.                                                                                         |
| context       | `object`                        | `{}`                               | Data stored across API calls.                                                                                     |
| updateContext | `Function`                      | `partialContext => updatedContext` | Used to update context. `partialContext` can either be an `object` or a function (`context` => `partialContext`). |
| response      | `undefined` / `GraphQlResponse` | _required_                         | [GraphQlResponse](#graphqlresponse).                                                                              |

### Allowing for multiple responses

Sometimes you may want an endpoint to respond with different status codes depending on what is sent. It is the recommendation of this package that this can be achieved by using scenarios. However, given `response` can be a function, it is possible to respond with a different value for the `status`, `headers`, `data` and `delay` properties:

```javascript
const mock = {
  url: '/some-url',
  method: 'GET',
  response: ({ body }) => {
    if (body.name === 'error1') {
      return {
        status: 400,
        data: { message: 'something went wrong' },
        delay: 1000,
      };
    }

    if (body.name === 'error2') {
      return {
        status: 500,
        data: { message: 'something else went wrong' },
        delay: 2000,
      };
    }

    if (body.name === 'notFound') {
      return {
        status: 404,
        data: { message: 'no data here' },
      };
    }

    // Default status is 200
    return { data: { message: 'success' } };
  },
};
```
