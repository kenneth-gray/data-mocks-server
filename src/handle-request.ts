import {
  getGraphQlMocks,
  getGraphQlMock,
  graphQlRequestHandler,
} from './graph-ql';
import { getHttpMocks, getHttpMockAndParams, httpRequestHandler } from './http';
import {
  Mock,
  ScenarioMap,
  DefaultScenario,
  Context,
  Scenario,
  PartialContext,
  InternalRequest,
  Result,
  GetCookie,
  SetCookie,
} from './types';
import { getDataMocksServerCookie, setDataMocksServerCookie } from './cookies';

function updateContext(context: Context, partialContext: PartialContext) {
  const newContext: Context = {
    ...context,
    ...(typeof partialContext === 'function'
      ? partialContext(context)
      : partialContext),
  };

  return newContext;
}

function mergeMocks(scenarioMap: ({ mocks: Mock[] } | Mock[])[]) {
  return scenarioMap.reduce<Mock[]>(
    (result, scenarioMock) =>
      result.concat(
        Array.isArray(scenarioMock) ? scenarioMock : scenarioMock.mocks,
      ),
    [],
  );
}

function getMocksFromScenarios(scenarios: Scenario[]) {
  const mocks = mergeMocks(scenarios);
  const httpMocks = getHttpMocks(mocks);
  const graphQlMocks = getGraphQlMocks(mocks);

  return { httpMocks, graphQlMocks };
}

function getScenarios({
  defaultScenario,
  scenarioMap,
  scenarioIds,
}: {
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  scenarioIds: string[];
}): Scenario[] {
  return [defaultScenario].concat(
    scenarioIds.map(scenarioId => scenarioMap[scenarioId]),
  );
}

async function handleRequest({
  req,
  getServerSelectedScenarioIds,
  defaultScenario,
  scenarioMap,
  getServerContext,
  setServerContext,
  getCookie,
  cookieMode,
  setCookie,
}: {
  req: InternalRequest;
  getServerSelectedScenarioIds: () => string[];
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  getServerContext: () => Context;
  setServerContext: (context: Context) => void;
  getCookie: GetCookie;
  setCookie: SetCookie;
  cookieMode: boolean;
}) {
  const dataMocksServerCookie = getDataMocksServerCookie({
    getCookie,
    defaultScenario,
  });

  const getSelectedScenarioIds = cookieMode
    ? () => dataMocksServerCookie.scenarios
    : getServerSelectedScenarioIds;

  const getContext = cookieMode
    ? () => dataMocksServerCookie.context
    : getServerContext;

  const setContext = cookieMode
    ? (context: Context) => {
        dataMocksServerCookie.context = context;
      }
    : setServerContext;

  const selectedScenarioIds = getSelectedScenarioIds();

  const selectedScenarios = getScenarios({
    defaultScenario,
    scenarioMap,
    scenarioIds: selectedScenarioIds,
  });

  const { httpMocks, graphQlMocks } = getMocksFromScenarios(selectedScenarios);

  const graphQlMock = getGraphQlMock(req.path, graphQlMocks);

  // Default when nothing matches
  let result: Result = { status: 404 };

  if (graphQlMock) {
    result = await graphQlRequestHandler({
      req,
      graphQlMock,
      updateContext: localUpdateContext,
      getContext,
    });
  } else {
    const { httpMock, params } = getHttpMockAndParams(req, httpMocks);
    if (httpMock) {
      result = await httpRequestHandler({
        req,
        httpMock,
        params,
        getContext,
        updateContext: localUpdateContext,
      });
    }
  }

  if (cookieMode) {
    setDataMocksServerCookie({ setCookie, value: dataMocksServerCookie });
  }

  return result;

  function localUpdateContext(partialContext: PartialContext) {
    const newContext = updateContext(getContext(), partialContext);

    setContext(newContext);

    return newContext;
  }
}

export { handleRequest };
