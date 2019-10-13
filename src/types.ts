export type Scenarios = {
  [scenario: string]: Mock[];
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type Mock = {
  url: string | RegExp;
  method: HttpMethod;
  response: object | string;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
};

export type Options = {
  port?: number;
};
