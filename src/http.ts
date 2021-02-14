import { pathToRegexp, Key } from 'path-to-regexp';
import { Request, Response } from 'express';

import { createHandler } from './create-handler';
import { Mock, HttpMock, UpdateContext, GetContext } from './types';

export { getHttpMocks, getHttpMockAndParams, createHttpRequestHandler };

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

function createHttpRequestHandler({
  httpMock,
  params,
  updateContext,
  getContext,
}: {
  httpMock: HttpMock;
  params: Record<string, any>;
  updateContext: UpdateContext;
  getContext: GetContext;
}) {
  return (req: Request, res: Response) => {
    // Matching all routes so need to create params manually
    req.params = params;

    const handler = createHandler({
      ...httpMock,
      getContext,
      updateContext,
    });

    handler(req, res);
  };
}

function getHttpMockAndParams(req: Request, httpMocks: HttpMock[]) {
  for (const httpMock of httpMocks) {
    if (httpMock.method !== req.method) {
      continue;
    }

    const { match, params } = getMatchAndParams(req.path, httpMock.url);

    if (match) {
      return {
        httpMock,
        params,
      };
    }
  }

  return {
    httpMock: null,
    params: {},
  };
}

function getMatchAndParams(reqPath: string, mockUrl: string | RegExp) {
  const params: Record<string, string> = {};
  const keys: Key[] = [];
  const regex = pathToRegexp(mockUrl, keys);
  const match = regex.exec(reqPath);

  if (!match) {
    return {
      match: false,
      params,
    };
  }

  for (let i = 1; i < match.length; i++) {
    const key = keys[i - 1];
    const prop = key.name;

    params[prop] = decodeURIComponent(match[i]);
  }

  return {
    match: true,
    params,
  };
}
