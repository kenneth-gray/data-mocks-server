import { RequestHandler } from 'express';
import { Scenarios } from './types';

export { modifyScenarios, resetScenarios };

function modifyScenarios({
  scenarioNames,
  scenarioMocks,
  updateScenarios,
}: {
  scenarioNames: string[];
  scenarioMocks: Scenarios;
  updateScenarios: (scenarios: string[]) => void;
}): RequestHandler {
  return ({ body: { scenarios: scenariosBody } }, res) => {
    if (!Array.isArray(scenariosBody)) {
      res.status(400).json({
        message:
          '"scenarios" must be an array of scenario names (empty array allowed)',
      });
      return;
    }

    const scenariosByGroup: { [key: string]: number } = {};
    for (const scenario of scenariosBody) {
      if (!scenarioNames.includes(scenario)) {
        res.status(400).json({
          message: `Scenario "${scenario}" does not exist`,
        });
        return;
      }

      const scenarioMock = scenarioMocks[scenario];
      if (!Array.isArray(scenarioMock) && scenarioMock.group) {
        const { group } = scenarioMock;
        if (scenariosByGroup[group]) {
          res.status(400).json({
            message: `Scenario "${scenario}" cannot be selected, because scenario "${scenariosByGroup[group]}" from group "${group}" has already been selected`,
          });
          return;
        }

        scenariosByGroup[group] = scenario;
      }
    }

    updateScenarios(scenariosBody);

    res.sendStatus(204);
  };
}

function resetScenarios({
  updateScenarios,
}: {
  updateScenarios: (scenarios: string[]) => void;
}): RequestHandler {
  return (_, res) => {
    updateScenarios([]);
    res.sendStatus(204);
  };
}
