import { ScenarioMap } from './types';
import { RequestHandler, Request, Response } from 'express';

export { getUi, updateUi };

function getUi({
  scenarioMap,
  getScenarioNames,
}: {
  scenarioMap: ScenarioMap;
  getScenarioNames: (req: Request, res: Response) => string[];
}): RequestHandler {
  return (req: Request, res: Response) => {
    const { groups, other } = getPageVariables(
      scenarioMap,
      getScenarioNames(req, res),
    );

    res.render('index.njk', {
      groups,
      other,
    });
  };
}

function updateUi({
  groupNames,
  scenarioNames,
  scenarioMap,
  updateScenariosAndContext,
}: {
  groupNames: string[];
  scenarioNames: string[];
  scenarioMap: ScenarioMap;
  updateScenariosAndContext: (res: Response, scenarios: string[]) => void;
}): RequestHandler {
  return (req: Request, res: Response) => {
    const {
      body: { scenarios: scenariosBody, button, ...rest },
    } = req;
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

    updateScenariosAndContext(res, updatedScenarios);

    const { groups, other } = getPageVariables(scenarioMap, updatedScenarios);

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
