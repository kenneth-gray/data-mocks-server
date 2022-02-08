import { Response, Request } from 'express';
import { CookieValue, DefaultScenario } from './types';
import { getContextFromScenarios } from './utils/get-context-from-scenarios';

export {
  getScenarioIdsFromCookie,
  getDataMocksServerCookie,
  setDataMocksServerCookie,
};

const CONTEXT_AND_SCENARIOS_COOKIE_NAME = 'data-mocks-server';

function expressSetCookie({
  res,
  name,
  value,
}: {
  res: Response;
  name: string;
  value: CookieValue;
}) {
  res.cookie(name, JSON.stringify(value), {
    encode: String,
  });
}

function expressGetCookie({
  req,
  res,
  name,
  defaultValue,
}: {
  req: Request;
  res: Response;
  name: string;
  defaultValue: CookieValue;
}): CookieValue {
  if (req.cookies[name]) {
    try {
      const value = JSON.parse(req.cookies[name]);

      return value;
    } catch (error) {
      // Cookie value was malformed, so needs resetting
      expressSetCookie({ res, name, value: defaultValue });
    }
  }

  return defaultValue;
}

function getScenarioIdsFromCookie({
  req,
  res,
  defaultValue,
}: {
  req: Request;
  res: Response;
  defaultValue: CookieValue;
}) {
  return expressGetCookie({
    req,
    res,
    name: CONTEXT_AND_SCENARIOS_COOKIE_NAME,
    defaultValue,
  }).scenarios;
}

function getDataMocksServerCookie({
  getCookie,
  defaultScenario,
}: {
  getCookie: (cookieName: string) => any;
  defaultScenario: DefaultScenario;
}): CookieValue {
  const cookie = getCookie(CONTEXT_AND_SCENARIOS_COOKIE_NAME);

  if (cookie) {
    try {
      const parsedCookie = JSON.parse(cookie);

      // Check that the parsed cookie matches the shape expected
      if (parsedCookie.context && Array.isArray(parsedCookie.scenarios)) {
        return parsedCookie;
      } else {
        console.error('Cookie value does not match expected shape');
      }
    } catch (error) {
      console.error('Cookie value could not be parsed');
    }
  }

  const defaultValue = {
    scenarios: [],
    context: getContextFromScenarios([defaultScenario]),
  };

  return defaultValue;
}

function setDataMocksServerCookie({
  setCookie,
  value,
}: {
  setCookie: (cookieName: string, cookieValue: string) => void;
  value: CookieValue;
}) {
  setCookie(CONTEXT_AND_SCENARIOS_COOKIE_NAME, JSON.stringify(value));
}
