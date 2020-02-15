# Data Mocks Server

A simple, customiseable HTTP server that can be used to provide mock data for APIs when developing applications.

Supports GET, PUT, POST and DELETE operations and also enables mocking of GraphQL endpoints when operations have an operation name provided.

Quickly switch between different scenarios by using the provided UI.

## Table of contents

- [Installation](#installation)
- [Example usage](#example-usage)
- [Responses](#responses)
  - [Context](#context)
- [Scenarios](#scenarios)
- [API](#api)
  - [run](#run)
    - [default](#default)
    - [scenarios](#scenarios-1)
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
- [Thanks](#thanks)

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

## Responses

A simple use case would be to respond with the same JSON every time:

```javascript
run({
  default: [
    {
      url: '/api/user/:id',
      method: 'GET',
      response: { name: 'Alice' },
    },
  ],
});
```

However, responses can also use functions (or async functions) to gain access to certain properties.

For HTTP mocks, `params`, `query` and `body` are available:

```javascript
run({
  default: [
    {
      url: '/api/users/:id',
      method: 'GET',
      response: ({ params: { id }, query: { filter } }) => {
        // /api/users/abc123?filter=100
        // id: 'abc123'
        // filter: '100'

        return {
          id,
          name: 'Ben',
        };
      },
    },
    {
      url: '/api/users',
      method: 'POST',
      response: async ({ body: { name } }) => {
        const id = await createUser(name);

        return {
          id,
          name,
        };
      },
    },
  ],
});
```

For GraphQL mocks, `variables` are available:

```javascript
run({
  default: [
    {
      url: '/api/graphql',
      method: 'GRAPHQL',
      operations: [
        {
          type: 'query',
          name: 'GetUser',
          response: ({ variables: { id } }) => {
            return {
              data: {
                user: {
                  id,
                  name: 'Charlotte',
                },
              },
            };
          },
        },
      ],
    },
  ],
});
```

Responses can also customise the following:
- The status code: `responseCode` (_number_).
- The delay in milliseconds before returning the response: `responseDelay` (_number_).
- What the response headers should contain: `responseHeaders` (_object_).

See [Override](#override) for more fine grained response control based on what was submitted to an endpoint.

### Context

Sometimes you want to be able to simulate data being modified. In these instances, context can help. It allows you to store and update an object of properties.

```javascript
run({
  default: {
    context: { name: 'Dennis' },
    mocks: [
      {
        url: '/api/users/:id',
        method: 'GET',
        response: ({ params: { id }, context: { name } }) => {
          return {
            id,
            // Use name from context
            name,
          };
        },
      },
      {
        url: '/api/users/:id',
        method: 'PUT',
        response: ({ body: { name }, updateContext }) => {
          // Update name in context
          updateContext({ name });

          return {
            id,
            name,
          };
        },
      },
    ],
  },
});
```

| API request | Response |
|-------------|----------|
| `GET` `/api/users/123` | `{ id: '123', name: 'Dennis' }` |
| `PUT` `/api/users/123` `{ name: 'Eleanor' }` | `{ id: '123', name: 'Eleanor' }` |
| `GET` `/api/users/123` | `{ id: '123', name: 'Eleanor' }` |

## Scenarios

TODO:

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

> `function({ query, body, params, context, updateContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| query | `object` | `{}` | query object as defined by `express`. |
| body | `object` | `{}` | body object as defined by `express`. |
| params | `object` | `{}` | params object as defined by `express`. |
| context | `object` | `{}` | Data stored across API calls. |
| updateContext | `Function` | `partialContext => updatedContext` | Used to update context. |
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

> `function({ variables, context, updateContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| variables | `object` | `{}` | variables sent by client. |
| context | `object` | `{}` | Data stored across API calls. |
| updateContext | `Function` | `partialContext => updatedContext` | Used to update context. |
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

## Thanks

This package was originally a port of https://github.com/ovotech/data-mocks. Thanks goes to [grug](https://github.com/grug) for his idea and implementation.

## Differences with data-mocks

- Uses an HTTP server instead of mocking out `fetch` and `XHR` operations.
- Multiple scenarios can be enabled at a time.
- A UI that allows you to set and reset scenarios.
- An API that allows you to set and reset scenarios (useful for testing).
- Ability to create more dynamic responses thanks to response functions and context.
