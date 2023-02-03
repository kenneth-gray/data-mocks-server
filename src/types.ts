export type Result = {
  status: number;
  headers?: Record<string, string>;
  response?: any;
};

export type DefaultScenario =
  | Mock[]
  | {
      context?: Context;
      mocks: Mock[];
    };

export type Scenario =
  | Mock[]
  | {
      group?: string;
      context?: Context;
      mocks: Mock[];
    };

export type ScenarioMap = {
  [scenario: string]: Scenario;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ResponseFunction<TInput, TResponse> = (
  input: TInput & {
    updateContext: UpdateContext;
    context: Context;
  },
) => TResponse | Promise<TResponse>;

export type MockResponse<TInput, TResponse> =
  | TResponse
  | ResponseFunction<TInput, TResponse>;

type HttpResponse = Record<string, any> | string | null;

export type ResponseProps<TInput, TResponse> = {
  response?: MockResponse<
    TInput,
    {
      data?: TResponse;
      status?: number;
      headers?: Record<string, string>;
      delay?: number;
    }
  >;
};

export type HttpMock = {
  url: string | RegExp;
  method: HttpMethod;
} & ResponseProps<
  {
    query: Record<string, string | Array<string>>;
    body: Record<string, any>;
    params: Record<string, string>;
  },
  HttpResponse
>;

type GraphQlResponse = {
  data?: null | Record<string, any>;
  errors?: Array<any>;
};

export type Operation = {
  type: 'query' | 'mutation';
  name: string;
} & ResponseProps<
  {
    variables: Record<string, any>;
  },
  GraphQlResponse
>;

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
  scenariosPath?: string;
  cookieMode?: boolean;
};

export type Context = Record<string, any>;
export type PartialContext = Context | ((context: Context) => Context);

export type UpdateContext = (partialContext: PartialContext) => Context;

export type GetContext = () => Context;

export type Groups = Array<{
  name: string;
  scenarios: Array<{
    id: string;
    selected: boolean;
  }>;
}>;

export type CookieValue = {
  context: Context;
  scenarios: string[];
};

export type InternalRequest = {
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  path: string;
  // TODO: Should probably only accept string or object
  body: any;
};

export type GetCookie = (cookieName: string) => string | undefined;
export type SetCookie = (cookieName: string, cookieValue: string) => void;
