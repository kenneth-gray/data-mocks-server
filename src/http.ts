import { Router } from 'express';

import { createHandler } from './create-handler';
import { Mock, HttpMock, Context, UpdateContext } from './types';

export { getHttpMocks, applyHttpRoutes };

function getHttpMocks(mocks: Mock[]) {
  const initialHttpMocks = mocks.filter(
    ({ method }) => method !== 'GRAPHQL',
  ) as HttpMock[];

  const httpMocksByUrlAndMethod = initialHttpMocks.reduce<
    Record<string, HttpMock>
  >((result, mock) => {
    const { url, method } = mock;
    // Always take the latest mock
    result[`${url.toString()}${method}`] = mock;

    return result;
  }, {});

  return Object.values(httpMocksByUrlAndMethod);
}

function applyHttpRoutes({
  router,
  httpMocks,
  getContext,
  updateContext,
}: {
  router: Router;
  httpMocks: HttpMock[];
  getContext: () => Context;
  updateContext: UpdateContext;
}) {
  httpMocks.forEach(httpMock => {
    const { method, url, ...rest } = httpMock;

    const handler = createHandler({
      ...rest,
      updateContext,
    });

    switch (httpMock.method) {
      case 'GET':
        router.get(url, (req, res) => {
          handler({ ...req, context: getContext() }, res);
        });
        break;
      case 'POST':
        router.post(url, (req, res) => {
          handler({ ...req, context: getContext() }, res);
        });
        break;
      case 'PUT':
        router.put(url, (req, res) => {
          handler({ ...req, context: getContext() }, res);
        });
        break;
      case 'DELETE':
        router.delete(url, (req, res) => {
          handler({ ...req, context: getContext() }, res);
        });
        break;
      default:
        throw new Error(
          `Unrecognised HTTP method ${method} - please check your mock configuration`,
        );
    }
  });
}
