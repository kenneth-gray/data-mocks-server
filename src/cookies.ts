import { CookieValue, DefaultScenario, GetCookie, SetCookie } from './types';
import { getContextFromScenarios } from './utils/get-context-from-scenarios';

export {
  getDataMocksServerCookie,
  setDataMocksServerCookie,
  getScenarioIdsFromCookie,
};

const CONTEXT_AND_SCENARIOS_COOKIE_NAME = 'data-mocks-server';

function getScenarioIdsFromCookie({
  getCookie,
  setCookie,
  defaultValue,
}: {
  getCookie: GetCookie;
  setCookie: SetCookie;
  defaultValue: CookieValue;
}) {
  let cookieValue = defaultValue;
  const cookie = getCookie(CONTEXT_AND_SCENARIOS_COOKIE_NAME);
  if (cookie) {
    try {
      cookieValue = JSON.parse(cookie);
    } catch (error) {
      // Cookie value was malformed, so needs resetting
      setCookie(CONTEXT_AND_SCENARIOS_COOKIE_NAME, JSON.stringify(cookieValue));
    }
  }

  return cookieValue.scenarios;
}

function getDataMocksServerCookie({
  getCookie,
  defaultScenario,
}: {
  getCookie: GetCookie;
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
  setCookie: SetCookie;
  value: CookieValue;
}) {
  setCookie(CONTEXT_AND_SCENARIOS_COOKIE_NAME, JSON.stringify(value));
}
