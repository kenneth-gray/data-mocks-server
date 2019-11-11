import rp from 'request-promise-native';
import { ServerWithKill } from 'server-with-kill';

import { run } from './index';

describe('run', () => {
  describe('port', () => {
    it('defaults to 3000', () => {
      const server = run({ default: [] });

      return serverTest(server, () => {
        const address = server.address();
        const port =
          !!address && typeof address !== 'string' ? address.port : 0;

        expect(port).toEqual(3000);
      });
    });

    it('can be set using options', () => {
      const expectedPort = 5000;
      const server = run({ default: [], options: { port: expectedPort } });

      return serverTest(server, () => {
        const address = server.address();
        const port =
          !!address && typeof address !== 'string' ? address.port : 0;

        expect(port).toEqual(expectedPort);
      });
    });
  });

  describe('default mocks', () => {
    it('respond as expected', () => {
      const expectedGetResponse = { get: 'food' };
      const expectedPostResponse = { post: 'mail' };
      const expectedPutResponse = { put: 'it down' };
      const expectedDeleteResponse = { delete: 'program' };

      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: expectedGetResponse,
          },
          {
            url: '/test-me',
            method: 'POST',
            response: expectedPostResponse,
          },
          {
            url: '/test-me',
            method: 'PUT',
            response: expectedPutResponse,
          },
          {
            url: '/test-me',
            method: 'DELETE',
            response: expectedDeleteResponse,
          },
        ],
      });

      return serverTest(server, async () => {
        const [
          getResponse,
          postResponse,
          putResponse,
          deleteResponse,
        ] = await Promise.all([
          rp.get('http://localhost:3000/test-me', { json: true }),
          rp.post('http://localhost:3000/test-me', { json: true }),
          rp.put('http://localhost:3000/test-me', { json: true }),
          rp.delete('http://localhost:3000/test-me', { json: true }),
        ]);

        expect(getResponse).toEqual(expectedGetResponse);
        expect(postResponse).toEqual(expectedPostResponse);
        expect(putResponse).toEqual(expectedPutResponse);
        expect(deleteResponse).toEqual(expectedDeleteResponse);
      });
    });

    it('delayed responses work', () => {
      const responseDelay = 500;
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            responseDelay,
            response: {},
          },
        ],
      });

      return serverTest(server, async () => {
        const startTime = getStartTime();

        await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        const duration = getDuration(startTime);

        expect(duration).toBeGreaterThanOrEqual(responseDelay);
      });
    });

    it('can use functions for responses', () => {
      const server = run({
        default: [
          {
            url: '/test-function/:id',
            method: 'POST',
            response: ({ body, query, params }) => ({
              body,
              query,
              params,
            }),
          },
        ],
      });

      return serverTest(server, async () => {
        const id = 'some-id';
        const testQuery = 'test-query';
        const body = { some: 'body' };
        const response = await rp.post(
          `http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
          { json: true, body },
        );

        expect(response).toEqual({
          body,
          query: {
            testQuery,
          },
          params: { id },
        });
      });
    });

    it('can use async functions for responses', () => {
      const server = run({
        default: [
          {
            url: '/test-function/:id',
            method: 'POST',
            response: async ({ body, query, params }) => ({
              body,
              query,
              params,
            }),
          },
        ],
      });

      return serverTest(server, async () => {
        const id = 'some-id';
        const testQuery = 'test-query';
        const body = { some: 'body' };
        const response = await rp.post(
          `http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
          { json: true, body },
        );

        expect(response).toEqual({
          body,
          query: {
            testQuery,
          },
          params: { id },
        });
      });
    });

    it('supports GraphQL query over GET', () => {
      const expectedResponse = {
        data: {
          firstName: 'Alan',
        },
      };
      const server = run({
        default: [
          {
            url: '/api/graphql',
            method: 'GRAPHQL',
            operations: [
              {
                type: 'query',
                name: 'Person',
                response: expectedResponse,
              },
            ],
          },
        ],
      });

      return serverTest(server, async () => {
        const query = `
          query Person {
            firstName
          }
        `;
        const response = await rp.get(
          `http://localhost:3000/api/graphql?query=${query}`,
          {
            json: true,
          },
        );

        expect(response).toEqual(expectedResponse);
      });
    });

    it('supports GraphQL over GET when operationName is a query param instead of included in GraphQL query', () => {
      const operationName = 'Person';
      const expectedResponse = {
        data: {
          firstName: 'Alan',
        },
      };
      const server = run({
        default: [
          {
            url: '/api/graphql',
            method: 'GRAPHQL',
            operations: [
              {
                type: 'query',
                name: operationName,
                response: expectedResponse,
              },
            ],
          },
        ],
      });

      return serverTest(server, async () => {
        const query = `
          {
            firstName
          }
        `;
        const response = await rp.get(
          `http://localhost:3000/api/graphql?query=${query}&operationName=${operationName}`,
          {
            json: true,
          },
        );

        expect(response).toEqual(expectedResponse);
      });
    });
  });

  describe('scenarios', () => {
    it('override default urls', () => {
      const expectedInitialResponse = {};
      const expectedResponse = { something: 'new' };
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: expectedInitialResponse,
          },
        ],
        scenarios: {
          test: [
            {
              url: '/test-me',
              method: 'GET',
              response: expectedResponse,
            },
          ],
        },
      });

      return serverTest(server, async () => {
        const initialResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        expect(initialResponse).toEqual(expectedInitialResponse);

        await rp.put('http://localhost:3000/modify-scenarios', {
          body: { scenarios: ['test'] },
          json: true,
        });

        const response = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        expect(response).toEqual(expectedResponse);
      });
    });

    it('multiple scenarios can be enabled', () => {
      const expectedResponse1 = { something: 'new' };
      const expectedResponse2 = { something: 'else' };
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: {},
          },
          {
            url: '/test-me-2',
            method: 'GET',
            response: {},
          },
        ],
        scenarios: {
          test: [
            {
              url: '/test-me',
              method: 'GET',
              response: expectedResponse1,
            },
          ],
          test2: [
            {
              url: '/test-me-2',
              method: 'GET',
              response: expectedResponse2,
            },
          ],
        },
      });

      return serverTest(server, async () => {
        await rp.put('http://localhost:3000/modify-scenarios', {
          body: { scenarios: ['test', 'test2'] },
          json: true,
        });

        const [response1, response2] = await Promise.all([
          rp.get('http://localhost:3000/test-me', {
            json: true,
          }),
          rp.get('http://localhost:3000/test-me-2', {
            json: true,
          }),
        ]);

        expect(response1).toEqual(expectedResponse1);
        expect(response2).toEqual(expectedResponse2);
      });
    });

    it('errors when attempting to enable 2 scenarios that are in the same group', () => {
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: {},
          },
        ],
        scenarios: {
          test: {
            group: 'test',
            mocks: [
              {
                url: '/test-me',
                method: 'GET',
                response: {},
              },
            ],
          },
          test2: {
            group: 'test',
            mocks: [
              {
                url: '/test-me',
                method: 'GET',
                response: {},
              },
            ],
          },
        },
      });

      return serverTest(server, async () => {
        expect.assertions(1);
        try {
          await rp.put('http://localhost:3000/modify-scenarios', {
            body: { scenarios: ['test', 'test2'] },
            json: true,
          });
        } catch ({ statusCode }) {
          expect(statusCode).toEqual(400);
        }
      });
    });

    it('can be reset', () => {
      const initialResponse = { something: 'old' };
      const scenarioResponse = { something: 'new' };
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: initialResponse,
          },
        ],
        scenarios: {
          test: [
            {
              url: '/test-me',
              method: 'GET',
              response: scenarioResponse,
            },
          ],
        },
      });

      return serverTest(server, async () => {
        const firstResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        expect(firstResponse).toEqual(initialResponse);

        await rp.put('http://localhost:3000/modify-scenarios', {
          body: { scenarios: ['test'] },
          json: true,
        });

        const secondResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        expect(secondResponse).toEqual(scenarioResponse);

        await rp.put('http://localhost:3000/reset-scenarios', {
          json: true,
        });

        const thirdResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        expect(thirdResponse).toEqual(initialResponse);
      });
    });

    it('reset-scenarios and modify-scenarios paths can be changed', () => {
      const initialResponse = { something: 'old' };
      const scenarioResponse = { something: 'new' };
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: initialResponse,
          },
        ],
        scenarios: {
          test: [
            {
              url: '/test-me',
              method: 'GET',
              response: scenarioResponse,
            },
          ],
        },
        options: {
          modifyScenariosPath: '/modify',
          resetScenariosPath: '/reset',
        },
      });

      return serverTest(server, async () => {
        const firstResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        expect(firstResponse).toEqual(initialResponse);

        await rp.put('http://localhost:3000/modify', {
          body: { scenarios: ['test'] },
          json: true,
        });

        const secondResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        expect(secondResponse).toEqual(scenarioResponse);

        await rp.put('http://localhost:3000/reset', {
          json: true,
        });

        const thirdResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        expect(thirdResponse).toEqual(initialResponse);
      });
    });
  });
});

function getStartTime() {
  return process.hrtime();
}

function getDuration(startTime: [number, number]) {
  const hrend = process.hrtime(startTime);
  return hrend[0] * 1000 + hrend[1] / 1000000;
}

function serverTest(server: ServerWithKill, fn: Function) {
  return new Promise((resolve, reject) => {
    server.on('listening', async () => {
      try {
        await fn();
        server.kill(() => {
          resolve();
        });
      } catch (error) {
        server.kill(() => {
          reject(error);
        });
      }
    });
  });
}
