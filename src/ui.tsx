import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RequestHandler, Request, Response } from 'express';

import { ScenarioMap } from './types';
import { Html } from './Html';
import { getScenarios } from './utils/get-scenarios';

export { getUi, updateUi };

function getUi({
  uiPath,
  scenarioMap,
  getScenarioNames,
}: {
  uiPath: string;
  scenarioMap: ScenarioMap;
  getScenarioNames: (req: Request, res: Response) => string[];
}): RequestHandler {
  return (req: Request, res: Response) => {
    const selectedScenarios = getScenarioNames(req, res);
    const { groups, other } = getScenarios(scenarioMap, selectedScenarios);

    const html = renderToStaticMarkup(
      <Html uiPath={uiPath} groups={groups} other={other} />,
    );

    res.send('<!DOCTYPE html>\n' + html);
  };
}

function updateUi({
  uiPath,
  groupNames,
  scenarioNames,
  scenarioMap,
  updateScenariosAndContext,
}: {
  uiPath: string;
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

    const { groups, other } = getScenarios(scenarioMap, updatedScenarios);

    const html = renderToStaticMarkup(
      <Html
        uiPath={uiPath}
        groups={groups}
        other={other}
        updatedScenarios={updatedScenarios}
      />,
    );

    res.send('<!DOCTYPE html>\n' + html);
  };
}
