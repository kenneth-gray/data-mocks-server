export type Scenarios = {
  [scenario: string]: Mock[];
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ResponseFunction = (input: {
  query: Record<string, string | Array<string>>;
  body: Record<string, any>;
  params: Record<string, string>;
}) => Promise<{
  response: Record<string, any> | string;
  responseHeaders?: Record<string, string>;
  responseCode?: number;
}>;

export type Mock = {
  url: string | RegExp;
  method: HttpMethod;
  response: Record<string, any> | string | ResponseFunction;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
};

export type Options = {
  port?: number;
};
