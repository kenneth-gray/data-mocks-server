import { Response } from 'express';

import {
  ResponseProps,
  MockResponse,
  UpdateContext,
  ResponseFunction,
  Override,
  Context,
} from './types';

export { createHandler };

function createHandler<TInput, TResponse>({
  response,
  responseCode = 200,
  responseHeaders,
  responseDelay = 0,
  updateContext,
  getContext,
}: ResponseProps<MockResponse<TInput, TResponse>> & {
  updateContext: UpdateContext;
  getContext: () => Context;
}) {
  return async (req: TInput, res: Response) => {
    const actualResponse =
      typeof response === 'function'
        ? await ((response as unknown) as ResponseFunction<TInput, TResponse>)({
            ...req,
            updateContext,
            context: getContext(),
          })
        : response;

    let responseCollection: {
      response?: any;
      responseDelay: number;
      responseHeaders?: Record<string, string>;
      responseCode: number;
    } = {
      responseDelay,
      responseHeaders,
      responseCode,
    };
    if (
      actualResponse !== null &&
      typeof actualResponse === 'object' &&
      (actualResponse as Override<TResponse>).__override &&
      Object.keys(actualResponse).length === 1
    ) {
      responseCollection = {
        ...responseCollection,
        ...(actualResponse as Override<TResponse>).__override,
      };
    } else {
      responseCollection.response = actualResponse;
    }

    await addDelay(responseCollection.responseDelay);

    if (
      responseCollection.response !== undefined &&
      (!responseCollection.responseHeaders ||
        !responseCollection.responseHeaders['Content-Type'])
    ) {
      responseCollection.responseHeaders = {
        ...responseCollection.responseHeaders,
        'Content-Type': 'application/json',
      };
    }

    if (
      responseCollection.responseHeaders &&
      responseCollection.responseHeaders['Content-Type'] === 'application/json'
    ) {
      responseCollection.response = JSON.stringify(responseCollection.response);
    }

    res
      .set(responseCollection.responseHeaders)
      .status(responseCollection.responseCode)
      .send(responseCollection.response);
  };
}

function addDelay(responseDelay: number) {
  return new Promise(res => setTimeout(res, responseDelay));
}
