export type Scenarios = {
  [scenario: string]:
    | Mock[]
    | {
        group: string;
        mocks: Mock[];
      };
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type Override<TResponse> = {
  __override: {
    response: TResponse;
    responseCode?: number;
    responseHeaders?: Record<string, string>;
    responseDelay?: number;
  };
};

export type ResponseFunction<TInput, TResponse> = (
  input: TInput,
) => TResponse | Override<TResponse> | Promise<TResponse | Override<TResponse>>;

export type MockResponse<TInput, TResponse> =
  | TResponse
  | ResponseFunction<TInput, TResponse>;

export type HttpMock = {
  url: string | RegExp;
  method: HttpMethod;
  response: MockResponse<
    {
      query: Record<string, string | Array<string>>;
      body: Record<string, any>;
      params: Record<string, string>;
    },
    Record<string, any> | string
  >;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  responseDelay?: number;
};

export type GraphQlResponse = {
  data?: null | Record<string, any>;
  errors?: Array<any>;
};

export type Operation = {
  type: 'query' | 'mutation';
  name: string;
  response: MockResponse<
    {
      operationName: string;
      query: string;
      variables: Record<string, any>;
    },
    GraphQlResponse | Record<string, any>
  >;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  responseDelay?: number;
};

export type GraphQlMock = {
  url: string;
  method: 'GRAPHQL';
  operations: Array<Operation>;
};

export type Mock = HttpMock | GraphQlMock;

export type Options = {
  port?: number;
  uiPath?: string;
  modifyScenariosPath?: string;
  resetScenariosPath?: string;
};
