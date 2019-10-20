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
    delay?: number;
  };
};

export type ResponseFunction<TResponse, TInput> = (
  input: TInput,
) => TResponse | Override<TResponse> | Promise<TResponse | Override<TResponse>>;

export type MockResponse<TResponse, TInput> =
  | TResponse
  | ResponseFunction<TResponse, TInput>;

export type HttpMock = {
  url: string | RegExp;
  method: HttpMethod;
  response: MockResponse<
    Record<string, any> | string,
    {
      query: Record<string, string | Array<string>>;
      body: Record<string, any>;
      params: Record<string, string>;
    }
  >;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
};

export type GraphqlMock = {
  url: string;
  method: 'GRAPHQL';
  operations: Array<{
    type: 'query' | 'mutation';
    operationName: string;
    response: MockResponse<
      { data?: Record<string, any>; errors?: Array<any> } | Record<string, any>,
      {
        operationName: string;
        query: string;
        variables: null | Record<string, any>;
      }
    >;
    responseCode?: number;
    responseHeaders?: Record<string, string>;
    delay?: number;
  }>;
};

export type Mock = HttpMock | GraphqlMock;

export type Options = {
  port?: number;
  uiPath?: string;
  modifyScenariosPath?: string;
  resetScenariosPath?: string;
};

export type Groups = Array<{
  name: string;
  noneChecked: boolean;
  scenarios: Array<{
    name: string;
    checked: boolean;
  }>;
}>;
