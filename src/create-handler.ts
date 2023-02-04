import {
  ResponseProps,
  MockResponse,
  UpdateContext,
  ResponseFunction,
  GetContext,
} from './types';

export { createHandler };

const DEFAULT_STATUS = 200;
const DEFAULT_DELAY = 0;

function createHandler<TInput, TResponse>({
  response = {},
  updateContext,
  getContext,
}: ResponseProps<TInput, TResponse> & {
  updateContext: UpdateContext;
  getContext: GetContext;
}) {
  return async (req: TInput) => {
    let {
      status = DEFAULT_STATUS,
      headers = {},
      data,
      delay = DEFAULT_DELAY,
    } = isResponseFunction(response)
      ? await response({
          ...req,
          updateContext,
          context: getContext(),
        })
      : response;

    headers = lowerCaseKeys(headers);

    await addDelay(delay);

    // Default repsonses to JSON when there's no content-type header
    if (data !== undefined && !headers['content-type']) {
      headers = {
        ...headers,
        'content-type': 'application/json',
      };
    }

    return {
      status,
      response: data,
      headers,
    };
  };
}

function addDelay(responseDelay: number) {
  return new Promise(res => setTimeout(res, responseDelay));
}

function isResponseFunction<TInput, TResponse>(
  response: MockResponse<TInput, TResponse>,
): response is ResponseFunction<TInput, TResponse> {
  return typeof response === 'function';
}

function lowerCaseKeys(obj: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
