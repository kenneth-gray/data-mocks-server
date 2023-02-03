import { setDataMocksServerCookie } from '../cookies';
import {
  Context,
  DefaultScenario,
  Scenario,
  ScenarioMap,
  SetCookie,
} from '../types';
import { getContextFromScenarios } from './get-context-from-scenarios';

export { updateScenariosAndContext };

function updateScenariosAndContext({
  updatedScenarioIds,
  setCookie,
  setServerContext,
  setServerSelectedScenarioIds,
  defaultScenario,
  scenarioMap,
  cookieMode,
}: {
  updatedScenarioIds: string[];
  setCookie: SetCookie;
  setServerContext: (context: Context) => void;
  setServerSelectedScenarioIds: (selectedScenarioIds: string[]) => void;
  defaultScenario: DefaultScenario;
  scenarioMap: ScenarioMap;
  cookieMode: boolean;
}) {
  const updatedScenarios = getScenarios({
    defaultScenario,
    scenarioMap,
    scenarioIds: updatedScenarioIds,
  });
  const context = getContextFromScenarios(updatedScenarios);

  if (cookieMode) {
    setDataMocksServerCookie({
      setCookie,
      value: {
        context,
        scenarios: updatedScenarioIds,
      },
    });

    return;
  }

  setServerContext(context);
  setServerSelectedScenarioIds(updatedScenarioIds);
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
