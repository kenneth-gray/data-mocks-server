import { RequestHandler, Response, Request } from 'express';
import { ScenarioMap } from './types';
import { getAllScenarios } from './utils/get-all-scenarios';

export { modifyScenarios, resetScenarios, getScenarios };

function modifyScenarios({
  scenarioNames,
  scenarioMap,
  updateScenariosAndContext,
}: {
  scenarioNames: string[];
  scenarioMap: ScenarioMap;
  updateScenariosAndContext: (res: Response, scenarios: string[]) => void;
}): RequestHandler {
  return ({ body: { scenarios: scenariosBody } }: Request, res: Response) => {
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

      const scenarioMock = scenarioMap[scenario];
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

    updateScenariosAndContext(res, scenariosBody);

    res.sendStatus(204);
  };
}

function resetScenarios({
  updateScenariosAndContext,
}: {
  updateScenariosAndContext: (res: Response, scenarios: string[]) => void;
}): RequestHandler {
  return (_, res: Response) => {
    updateScenariosAndContext(res, []);
    res.sendStatus(204);
  };
}

function getScenarios({
  scenarioMap,
  getScenarioNames,
}: {
  scenarioMap: ScenarioMap;
  getScenarioNames: (req: Request, res: Response) => string[];
}): RequestHandler {
  return (req: Request, res: Response) => {
    const data = getAllScenarios(scenarioMap, getScenarioNames(req, res));

    res.json(data);
  };
}
