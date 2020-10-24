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

> `Array<Mock> | { context, mocks }` | _required_

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| context | `object` | `undefined` | Used to set up data across API calls. |
| mocks | `Array<Mock>` | _required_ | See [Mock](#mock) for more details. |

#### scenarios

> `{ [scenarioName]: Array<Mock> | { group, mocks } }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| scenarioName | `string` | _required_ | Name of scenario. |
| Mock | `Mock` | _required_ | See [Mock](#mock) for more details. |
| group | `string` | `undefined` | Used to group scenarios together so that only one scenario in a group can be selected. |
| context | `object` | `undefined` | Used to set up data across API calls. |
| mocks | `Array<Mock>` | _required_ | See [Mock](#mock) for more details. |

#### options

> `{ port, uiPath, modifyScenariosPath, resetScenariosPath }` | defaults to `{}`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| port | `number` | `3000` | Port that the http server runs on. |
| uiPath | `string` | `/` | Path that the UI will load on. `http://localhost:{port}{uiPath}` |
| modifyScenariosPath | `string` | `/modify-scenarios` | API path for modifying scenarios. `http://localhost:{port}{modifyScenariosPath}` |
| resetScenariosPath | `string` | `/reset-scenarios` | API path for resetting scenarios. `http://localhost:{port}{resetScenariosPath}` |

## Types

### Mock

> `HttpMock | GraphQlMock`

See [HttpMock](#httpmock) and [GraphQlMock](#graphqlmock) for more details.

### HttpMock

> `{ url, method, response, responseCode, responseHeaders, responseDelay }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| url | `string` / `RegExp` | _required_ | Path of endpoint. Must start with `/`. |
| method | `'GET'` / `'POST'` / `'PUT'` / `'DELETE'` | _required_ | HTTP method of endpoint. |
| response | `undefined` / `Response` / `HttpResponseFunction` | `undefined` | [Response](#response), [HttpResponseFunction](#httpresponsefunction). |
| responseCode | `number` | `200` | HTTP status code for response. |
| responseHeaders | `object` / `undefined` | See description | Key/value pairs of HTTP headers for response. Defaults to `undefined` when response is `undefined`, adds `'Content-Type': 'application/json'` when response is not `undefined` and `Content-Type` is not supplied. |
| responseDelay | `number` | `0` | Number of milliseconds before the response is returned. |

### Response

> `null` / `string` / `object`

### HttpResponseFunction

> `function({ query, body, params, context, updateContext, getContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| query | `object` | `{}` | query object as defined by `express`. |
| body | `object` | `{}` | body object as defined by `express`. |
| params | `object` | `{}` | params object as defined by `express`. |
| context | `object` | `{}` | Data stored across API calls. |
| updateContext | `Function` | `partialContext => updatedContext` | Used to update context. |
| getContext | `Function` | `() => context` | Used to get the latest context. |
| response | `undefined` / `Response` / `Override` | _required_ | [Response](#response), [Override](#override). |

### GraphQlMock

> `{ url, method, operations }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| url | `string` | _required_ | Path of endpoint. |
| method | `'GRAPHQL'` | _required_ | Indentifies this mock as a GraphQlMock. |
| operations | `Array<Operation>` | _required_ | List of operations for GraphQL endpoint. See [Operation](#operation) for more details. |

#### Operation

> `{ type, name, response, responseCode, responseHeaders, responseDelay }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| type | `'query'` / `'mutation'` | _required_ | Type of operation. |
| name | `string` | _required_ | Name of operation. |
| response | `undefined` / `Response` / `GraphQlResponse` / `GraphQlResponseFunction` | `undefined` | [Response](#response), [GraphQlResponse](#graphqlresponse), [GraphQlResponseFunction](#graphqlresponsefunction). |
| responseCode | `number` | `200` | HTTP status code for response. |
| responseHeaders | `object` / `undefined` | See description | Key/value pairs of HTTP headers for response. Defaults to `undefined` when response is `undefined`, adds `'Content-Type': 'application/json'` when response is not `undefined` and `Content-Type` is not supplied. |
| responseDelay | `number` | `0` | Number of milliseconds before the response is returned. |

### GraphQlResponse

> `{ data?: null / object, errors?: array }`

### GraphQlResponseFunction

> `function({ variables, context, updateContext, getContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| variables | `object` | `{}` | variables sent by client. |
| context | `object` | `{}` | Data stored across API calls. |
| updateContext | `Function` | `partialContext => updatedContext` | Used to update context. |
| getContext | `Function` | `() => context` | Used to get the latest context. |
| response | `undefined` / `Response` / `GraphQlResponse` / `Override` | _required_ | [Response](#response), [GraphQlResponse](#graphqlresponse), [Override](#override). |

### Override

> `{ __override: { response, responseCode, responseHeaders, responseDelay } }`

Sometimes you may want an endpoint to respond with different status codes depending on what is sent. It is the recommendation of this package that this can be achieved by using scenarios. However, as an escape hatch you can override `responseCode`, `responseHeaders` and `responseDelay` by using the `__override` property:

```javascript
const mock = {
  url: '/some-url',
  method: 'GET',
  response: ({ body }) => {
    if (body.name === 'error1') {
      return {
        __override: {
          response: { message: 'something went wrong' },
          responseCode: 400,
          responseDelay: 1000,
        },
      };
    }

    if (body.name === 'error2') {
      return {
        __override: {
          response: { message: 'something else went wrong' },
          responseCode: 500,
          responseDelay: 2000,
        },
      };
    }

    if (body.name === 'notFound') {
      return {
        __override: {
          response: { message: 'no data here' },
          responseCode: 404,
        },
      };
    }

    // No __override necessary, this is the response on success
    return { message: 'success' };
  },
}
```
