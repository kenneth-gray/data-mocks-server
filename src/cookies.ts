import { Response, Request } from 'express';
import { Context } from './types';

export {
  getScenariosFromCookie,
  getContextFromCookie,
  setScenariosCookie,
  setContextCookie,
};

const SCENARIOS_COOKIE_NAME = 'data-mocks-server-scenarios';
const CONTEXT_COOKIE_NAME = 'data-mocks-server-context';

function setCookie({
  res,
  name,
  value,
}: {
  res: Response;
  name: string;
  value: any;
}) {
  res.cookie(name, JSON.stringify(value), {
    encode: String,
  });
}

function getCookie({
  req,
  res,
  name,
  defaultValue,
}: {
  req: Request;
  res: Response;
  name: string;
  defaultValue: any;
}) {
  if (req.cookies[name]) {
    try {
      const value = JSON.parse(req.cookies[name]);

      return value;
    } catch (error) {
      // Cookie value was malformed, so needs resetting
      setCookie({ res, name, value: defaultValue });
    }
  }

  return defaultValue;
}

function getScenariosFromCookie({
  req,
  res,
  defaultValue,
}: {
  req: Request;
  res: Response;
  defaultValue: string[];
}) {
  return getCookie({ req, res, name: SCENARIOS_COOKIE_NAME, defaultValue });
}

function getContextFromCookie({
  req,
  res,
  defaultValue,
}: {
  req: Request;
  res: Response;
  defaultValue: Context;
}) {
  return getCookie({
    req,
    res,
    name: CONTEXT_COOKIE_NAME,
    defaultValue,
  });
}

function setContextCookie(res: Response, context: Context) {
  setCookie({ res, name: CONTEXT_COOKIE_NAME, value: context });
}

function setScenariosCookie(res: Response, scenarios: string[]) {
  setCookie({ res, name: SCENARIOS_COOKIE_NAME, value: scenarios });
}
