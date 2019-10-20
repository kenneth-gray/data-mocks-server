import rp from 'request-promise-native';
import { ServerWithKill } from 'server-with-kill';

import { run } from './index';

describe('run', () => {
  describe('port', () => {
    it('defaults to 3000', done => {
      const server = run({ default: [] });

      server.on('listening', () => {
        const address = server.address();
        const port =
          !!address && typeof address !== 'string' ? address.port : 0;

        safeExpect(server, port).toEqual(3000);

        server.kill(done);
      });
    });

    it('can be set using options', done => {
      const expectedPort = 5000;
      const server = run({ default: [], options: { port: expectedPort } });

      server.on('listening', () => {
        const address = server.address();
        const port =
          !!address && typeof address !== 'string' ? address.port : 0;

        safeExpect(server, port).toEqual(expectedPort);

        server.kill(done);
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

      server.on('listening', async () => {
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

        safeExpect(server, getResponse).toEqual(expectedGetResponse);
        safeExpect(server, postResponse).toEqual(expectedPostResponse);
        safeExpect(server, putResponse).toEqual(expectedPutResponse);
        safeExpect(server, deleteResponse).toEqual(expectedDeleteResponse);

        server.kill(done);
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

      server.on('listening', async () => {
        const id = 'some-id';
        const testQuery = 'test-query';
        const body = { some: 'body' };
        const response = await rp.post(
          `http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
          { json: true, body },
        );

        safeExpect(server, response).toEqual({
          body,
          query: {
            testQuery,
          },
          params: { id },
        });

        server.kill(done);
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

      server.on('listening', async () => {
        const id = 'some-id';
        const testQuery = 'test-query';
        const body = { some: 'body' };
        const response = await rp.post(
          `http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
          { json: true, body },
        );

        safeExpect(server, response).toEqual({
          body,
          query: {
            testQuery,
          },
          params: { id },
        });

        server.kill(done);
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

      server.on('listening', async () => {
        await rp.put('http://localhost:3000/modify-scenarios', {
          body: { scenarios: ['test'] },
          json: true,
        });

        const response = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        safeExpect(server, response).toEqual(expectedResponse);

        server.kill(done);
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

      server.on('listening', async () => {
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

        safeExpect(server, response1).toEqual(expectedResponse1);
        safeExpect(server, response2).toEqual(expectedResponse2);

        server.kill(done);
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

      server.on('listening', async () => {
        expect.assertions(1);
        try {
          await rp.put('http://localhost:3000/modify-scenarios', {
            body: { scenarios: ['test', 'test2'] },
            json: true,
          });
        } catch ({ statusCode }) {
          safeExpect(server, statusCode).toEqual(400);
        }

        server.kill(done);
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

      server.on('listening', async () => {
        const firstResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        safeExpect(server, firstResponse).toEqual(initialResponse);

        await rp.put('http://localhost:3000/modify-scenarios', {
          body: { scenarios: ['test'] },
          json: true,
        });

        const secondResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        safeExpect(server, secondResponse).toEqual(scenarioResponse);

        await rp.put('http://localhost:3000/reset-scenarios', {
          json: true,
        });

        const thirdResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        safeExpect(server, thirdResponse).toEqual(initialResponse);

        server.kill(done);
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

      server.on('listening', async () => {
        const firstResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        safeExpect(server, firstResponse).toEqual(initialResponse);

        await rp.put('http://localhost:3000/modify', {
          body: { scenarios: ['test'] },
          json: true,
        });

        const secondResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });
        safeExpect(server, secondResponse).toEqual(scenarioResponse);

        await rp.put('http://localhost:3000/reset', {
          json: true,
        });

        const thirdResponse = await rp.get('http://localhost:3000/test-me', {
          json: true,
        });

        safeExpect(server, thirdResponse).toEqual(initialResponse);

        server.kill(done);
      });
    });
  });
});

function safeExpect(server: ServerWithKill, value: any) {
  return {
    toEqual(equalValue: any) {
      try {
        expect(value).toEqual(equalValue);
      } catch (error) {
        server.kill();
        throw error;
      }
    },
  };
}
