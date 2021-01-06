import { Router, RequestHandler } from 'express';

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
    const requestHandler: RequestHandler = ({ body, query, params }, res) =>
      handler({ body, query, params }, res);

    switch (method) {
      case 'GET':
        router.get(url, requestHandler);
        break;
      case 'POST':
        router.post(url, requestHandler);
        break;
      case 'PUT':
        router.put(url, requestHandler);
        break;
      case 'DELETE':
        router.delete(url, requestHandler);
        break;
      case 'PATCH':
        router.patch(url, requestHandler);
        break;
      default:
        throw new Error(
          `Unrecognised HTTP method ${method} - please check your mock configuration`,
        );
    }
  });
}
