import { Groups, ScenarioMap } from '../types';

export { getAllScenarios };

function getAllScenarios(
  scenarioMap: ScenarioMap,
  selectedScenarios: string[],
) {
  const { other, ...groupedScenarios } = Object.entries(scenarioMap).reduce<{
    other: string[];
    [key: string]: string[];
  }>(
    (result, [scenarioName, scenarioMock]) => {
      if (Array.isArray(scenarioMock) || scenarioMock.group == null) {
        result.other.push(scenarioName);

        return result;
      }

      const { group } = scenarioMock;

      if (!result[group]) {
        result[group] = [];
      }

      result[group].push(scenarioName);

      return result;
    },
    { other: [] },
  );

  const groups = Object.entries(groupedScenarios).reduce<Groups>(
    (result, [name, groupScenarios]) => {
      const scenarios = groupScenarios.map(scenarioId => {
        const selected = selectedScenarios.includes(scenarioId);

        return {
          id: scenarioId,
          selected,
        };
      });

      result.push({
        name,
        scenarios,
      });

      return result;
    },
    [],
  );

  return {
    groups,
    other: other.map(scenario => ({
      id: scenario,
      selected: selectedScenarios.includes(scenario),
    })),
  };
}
