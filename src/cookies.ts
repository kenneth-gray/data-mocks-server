import { Response, Request } from 'express';
import { Context, CookieValue } from './types';

export {
  getScenarioIdsFromCookie,
  getContextFromCookie,
  setContextAndScenariosCookie,
};

const CONTEXT_AND_SCENARIOS_COOKIE_NAME = 'data-mocks-server';

function setCookie({
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

function getCookie({
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
      setCookie({ res, name, value: defaultValue });
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
  return getCookie({
    req,
    res,
    name: CONTEXT_AND_SCENARIOS_COOKIE_NAME,
    defaultValue,
  }).scenarios;
}

function getContextFromCookie({
  req,
  res,
  defaultValue,
}: {
  req: Request;
  res: Response;
  defaultValue: CookieValue;
}) {
  return getCookie({
    req,
    res,
    name: CONTEXT_AND_SCENARIOS_COOKIE_NAME,
    defaultValue,
  }).context;
}

function setContextAndScenariosCookie(
  res: Response,
  contextAndScenarios: { context: Context; scenarios: string[] },
) {
  setCookie({
    res,
    name: CONTEXT_AND_SCENARIOS_COOKIE_NAME,
    value: contextAndScenarios,
  });
}
