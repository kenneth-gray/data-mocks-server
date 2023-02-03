import { getScenarioIdsFromCookie } from './cookies';
import {
  Context,
  DefaultScenario,
  GetCookie,
  Result,
  ScenarioMap,
  SetCookie,
} from './types';
import { getAllScenarios } from './utils/get-all-scenarios';
import { getContextFromScenarios } from './utils/get-context-from-scenarios';
import { updateScenariosAndContext } from './utils/update-scenarios-and-context';

export { resetScenarios, modifyScenarios, getScenarios };

function resetScenarios({
  setCookie,
  setServerContext,
  setServerSelectedScenarioIds,
  defaultScenario,
  scenarioMap,
  cookieMode,
}: {
  setCookie: SetCookie;
  setServerContext: (context: Context) => void;
  setServerSelectedScenarioIds: (selectedScenarioIds: string[]) => void;
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  cookieMode: boolean;
}): Result {
  updateScenariosAndContext({
    updatedScenarioIds: [],
    setCookie,
    setServerContext,
    setServerSelectedScenarioIds,
    defaultScenario,
    scenarioMap,
    cookieMode,
  });

  return {
    status: 204,
  };
}

function getScenarios({
  getCookie,
  setCookie,
  getServerSelectedScenarioIds,
  cookieMode,
  defaultScenario,
  scenarioMap,
}: {
  getCookie: GetCookie;
  setCookie: SetCookie;
  getServerSelectedScenarioIds: () => string[];
  cookieMode: boolean;
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
}): Result {
  const allScenarios = getAllScenarios(
    scenarioMap,
    getSelectedScenarioIds({
      getCookie,
      setCookie,
      getServerSelectedScenarioIds,
      cookieMode,
      defaultScenario,
    }),
  );

  return {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
    response: allScenarios,
  };
}

function modifyScenarios({
  updatedScenarioIds,
  scenarioIds,
  scenarioMap,
  cookieMode,
  defaultScenario,
  setCookie,
  setServerContext,
  setServerSelectedScenarioIds,
}: {
  updatedScenarioIds: unknown;
  scenarioIds: string[];
  scenarioMap: ScenarioMap;
  cookieMode: boolean;
  defaultScenario: DefaultScenario;
  setCookie: SetCookie;
  setServerContext: (context: Context) => void;
  setServerSelectedScenarioIds: (selectedScenarioIds: string[]) => void;
}) {
  // TODO: Check what type of individual items are
  if (!Array.isArray(updatedScenarioIds)) {
    return {
      status: 400,
      headers: {
        'content-type': 'application/json',
      },
      response: {
        message:
          '"scenarios" must be an array of scenario names (empty array allowed)',
      },
    };
  }

  const scenariosByGroup: { [key: string]: number } = {};
  for (const scenario of updatedScenarioIds) {
    if (!scenarioIds.includes(scenario)) {
      return {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
        response: {
          message: `Scenario "${scenario}" does not exist`,
        },
      };
    }

    const scenarioMock = scenarioMap[scenario];
    if (!Array.isArray(scenarioMock) && scenarioMock.group) {
      const { group } = scenarioMock;
      if (scenariosByGroup[group]) {
        return {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
          response: {
            message: `Scenario "${scenario}" cannot be selected, because scenario "${scenariosByGroup[group]}" from group "${group}" has already been selected`,
          },
        };
      }

      scenariosByGroup[group] = scenario;
    }
  }

  updateScenariosAndContext({
    cookieMode,
    defaultScenario,
    updatedScenarioIds,
    scenarioMap,
    setCookie,
    setServerContext,
    setServerSelectedScenarioIds,
  });

  return { status: 204 };
}

function getSelectedScenarioIds({
  getCookie,
  setCookie,
  getServerSelectedScenarioIds,
  cookieMode,
  defaultScenario,
}: {
  getCookie: GetCookie;
  setCookie: SetCookie;
  getServerSelectedScenarioIds: () => string[];
  cookieMode: boolean;
  defaultScenario: DefaultScenario;
}) {
  if (cookieMode) {
    return getScenarioIdsFromCookie({
      getCookie,
      setCookie,
      defaultValue: {
        context: getContextFromScenarios([defaultScenario]),
        scenarios: [],
      },
    });
  }

  return getServerSelectedScenarioIds();
}
