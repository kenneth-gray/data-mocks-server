import {
  ResponseProps,
  MockResponse,
  UpdateContext,
  ResponseFunction,
  Override,
  GetContext,
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
  getContext: GetContext;
}) {
  return async (req: TInput) => {
    const actualResponse = isResponseFunction(response)
      ? await response({
          ...req,
          updateContext,
          context: getContext(),
        })
      : response;

    let responseCollection: {
      response?: any;
      responseDelay: number;
      responseHeaders: Record<string, string>;
      responseCode: number;
    } = {
      responseDelay,
      responseHeaders: lowerCaseKeys(responseHeaders || {}),
      responseCode,
    };

    if (isOverride(actualResponse)) {
      responseCollection = {
        ...responseCollection,
        ...actualResponse.__override,
      };
    } else {
      responseCollection.response = actualResponse;
    }

    await addDelay(responseCollection.responseDelay);

    // Default repsonses to JSON when there's no content-type header
    if (
      responseCollection.response !== undefined &&
      !responseCollection.responseHeaders['content-type']
    ) {
      responseCollection.responseHeaders = {
        ...responseCollection.responseHeaders,
        'content-type': 'application/json',
      };
    }

    if (
      responseCollection.responseHeaders['content-type'] === 'application/json'
    ) {
      // TODO: This is express specific so shouldn't live here
      responseCollection.response = JSON.stringify(responseCollection.response);
    }

    return {
      status: responseCollection.responseCode,
      response: responseCollection.response,
      headers: responseCollection.responseHeaders,
    };
  };
}

function addDelay(responseDelay: number) {
  return new Promise(res => setTimeout(res, responseDelay));
}

function isOverride<TResponse>(
  response: TResponse | Override<TResponse> | undefined,
): response is Override<TResponse> {
  return (
    response !== null &&
    typeof response === 'object' &&
    (response as Override<TResponse>).__override &&
    Object.keys(response).length === 1
  );
}

function isResponseFunction<TInput, TResponse>(
  response: MockResponse<TInput, TResponse> | undefined,
): response is ResponseFunction<TInput, TResponse> {
  return typeof response === 'function';
}

function lowerCaseKeys(obj: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
