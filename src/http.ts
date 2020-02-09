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
    result[`${String(url)}${method}`] = mock;

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
  httpMocks.forEach(({ method, url, ...rest }) => {
    const handler = createHandler({
      ...rest,
      updateContext,
      getContext,
    });

    switch (method) {
      case 'GET':
        router.get(url, handler);
        break;
      case 'POST':
        router.post(url, handler);
        break;
      case 'PUT':
        router.put(url, handler);
        break;
      case 'DELETE':
        router.delete(url, handler);
        break;
      default:
        throw new Error(
          `Unrecognised HTTP method ${method} - please check your mock configuration`,
        );
    }
  });
}
