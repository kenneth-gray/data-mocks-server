import rp from 'request-promise-native';
import { ServerWithKill } from 'server-with-kill';

import { run } from './index';

describe('run', () => {
  describe('port', () => {
    it('defaults to 3000', done => {
      const server = run({ default: [] });

      serverTest(server, done, () => {
        const address = server.address();
        const port =
          !!address && typeof address !== 'string' ? address.port : 0;

        expect(port).toEqual(3000);
      });
    });

    it('can be set using options', done => {
      const expectedPort = 5000;
      const server = run({ default: [], options: { port: expectedPort } });

      serverTest(server, done, () => {
        const address = server.address();
        const port =
          !!address && typeof address !== 'string' ? address.port : 0;

        expect(port).toEqual(expectedPort);
      });
    });
  });

  describe('default mocks', () => {
    it('respond as expected', done => {
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

      serverTest(server, done, async () => {
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

    it('delayed responses work', done => {
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

      serverTest(server, done, async () => {
        const startTime = getStartTime();

        await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        const duration = getDuration(startTime);

        expect(duration).toBeGreaterThanOrEqual(responseDelay);
      });
    });

    it('can use functions for responses', done => {
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

      serverTest(server, done, async () => {
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

    it('can use async functions for responses', done => {
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

      serverTest(server, done, async () => {
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

    it('supports GraphQL query over GET', done => {
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

      serverTest(server, done, async () => {
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

    it('supports GraphQL over GET when operationName is a query param instead of included in GraphQL query', done => {
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

      serverTest(server, done, async () => {
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
    it('override default urls', done => {
      const expectedResponse = { something: 'new' };
      const server = run({
        default: [
          {
            url: '/test-me',
            method: 'GET',
            response: {},
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

      serverTest(server, done, async () => {
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

    it('multiple scenarios can be enabled', done => {
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

      serverTest(server, done, async () => {
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

    it('errors when attempting to enable 2 scenarios that are in the same group', done => {
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

      serverTest(server, done, async () => {
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

    it('can be reset', done => {
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

      serverTest(server, done, async () => {
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

    it('reset-scenarios and modify-scenarios paths can be changed', done => {
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

      serverTest(server, done, async () => {
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

function serverTest(
  server: ServerWithKill,
  done: jest.DoneCallback,
  fn: Function,
) {
  server.on('listening', async () => {
    try {
      await fn();
      server.kill(done);
    } catch (error) {
      server.kill();
      throw error;
    }
  });
}
