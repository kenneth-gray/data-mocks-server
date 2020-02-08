import { Scenarios } from './types';
import { RequestHandler } from 'express';

export { getUi, updateUi };

function getUi({
  scenarioMocks,
  getScenarios,
}: {
  scenarioMocks: Scenarios;
  getScenarios: () => string[];
}): RequestHandler {
  return (_, res) => {
    const { groups, other } = getPageVariables(scenarioMocks, getScenarios());

    res.render('index.njk', {
      groups,
      other,
    });
  };
}

function updateUi({
  groupNames,
  scenarioNames,
  scenarioMocks,
  updateScenarios,
}: {
  groupNames: string[];
  scenarioNames: string[];
  scenarioMocks: Scenarios;
  updateScenarios: (scenarios: string[]) => void;
}): RequestHandler {
  return ({ body: { scenarios: scenariosBody, button, ...rest } }, res) => {
    let updatedScenarios: string[] = [];

    if (button === 'modify') {
      updatedScenarios = groupNames
        .reduce<string[]>((result, groupName) => {
          if (rest[groupName]) {
            result.push(rest[groupName]);
          }

          return result;
        }, [])
        .concat(scenariosBody == null ? [] : scenariosBody)
        .filter(scenarioName => scenarioNames.includes(scenarioName));
    }

    updateScenarios(updatedScenarios);

    const { groups, other } = getPageVariables(scenarioMocks, updatedScenarios);

    res.render('index.njk', {
      groups,
      other,
      updatedScenarios,
    });
  };
}

type Groups = Array<{
  name: string;
  noneChecked: boolean;
  scenarios: Array<{
    name: string;
    checked: boolean;
  }>;
}>;

function getPageVariables(
  scenarioMocks: Scenarios,
  selectedScenarios: string[],
) {
  const { other, ...groupedScenarios } = Object.entries(scenarioMocks).reduce<{
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
      let noneChecked = true;
      const scenarios = groupScenarios.map(scenario => {
        const checked = selectedScenarios.includes(scenario);
        if (checked) {
          noneChecked = false;
        }

        return {
          name: scenario,
          checked,
        };
      });

      result.push({
        noneChecked,
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
      name: scenario,
      checked: selectedScenarios.includes(scenario),
    })),
  };
}
