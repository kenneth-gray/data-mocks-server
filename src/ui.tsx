import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  Context,
  DefaultScenario,
  GetCookie,
  ScenarioMap,
  SetCookie,
} from './types';
import { Html } from './Html';
import { getAllScenarios } from './utils/get-all-scenarios';
import { updateScenariosAndContext } from './utils/update-scenarios-and-context';
import { getScenarioIdsFromCookie } from './cookies';
import { getContextFromScenarios } from './utils/get-context-from-scenarios';

export { getUi, updateUi };

function getUi({
  uiPath,
  scenarioMap,
  cookieMode,
  getCookie,
  setCookie,
  defaultScenario,
  getServerSelectedScenarioIds,
}: {
  uiPath: string;
  scenarioMap: ScenarioMap;
  cookieMode: boolean;
  getCookie: GetCookie;
  setCookie: SetCookie;
  defaultScenario: DefaultScenario;
  getServerSelectedScenarioIds: () => string[];
}) {
  const selectedScenarioIds = getSelectedScenarioIdsV2({
    cookieMode,
    getCookie,
    setCookie,
    defaultScenario,
    getServerSelectedScenarioIds,
  });
  const { groups, other } = getAllScenarios(scenarioMap, selectedScenarioIds);

  const html = renderToStaticMarkup(
    <Html uiPath={uiPath} groups={groups} other={other} />,
  );

  return '<!DOCTYPE html>\n' + html;
}

function getSelectedScenarioIdsV2({
  cookieMode,
  getCookie,
  setCookie,
  defaultScenario,
  getServerSelectedScenarioIds,
}: {
  cookieMode: boolean;
  getCookie: GetCookie;
  setCookie: SetCookie;
  defaultScenario: DefaultScenario;
  getServerSelectedScenarioIds: () => string[];
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

function updateUi({
  uiPath,
  groupNames,
  scenarioIds,
  updatedScenarioIds,
  buttonType,
  scenarioMap,
  groupScenario,
  cookieMode,
  defaultScenario,
  setCookie,
  setServerContext,
  setServerSelectedScenarioIds,
}: {
  uiPath: string;
  groupNames: string[];
  scenarioIds: string[];
  updatedScenarioIds: string[];
  buttonType: 'modify' | 'reset';
  scenarioMap: ScenarioMap;
  groupScenario: Record<string, string>;
  cookieMode: boolean;
  defaultScenario: DefaultScenario;
  setCookie: SetCookie;
  setServerContext: (context: Context) => void;
  setServerSelectedScenarioIds: (selectedScenarioIds: string[]) => void;
}) {
  let updatedScenarios: string[] = [];

  if (buttonType === 'modify') {
    updatedScenarios = groupNames
      .reduce<string[]>((result, groupName) => {
        if (groupScenario[groupName]) {
          result.push(groupScenario[groupName]);
        }

        return result;
      }, [])
      .concat(updatedScenarioIds == null ? [] : updatedScenarioIds)
      .filter(scenarioId => scenarioIds.includes(scenarioId));
  }

  updateScenariosAndContext({
    updatedScenarioIds: updatedScenarios,
    scenarioMap,
    cookieMode,
    defaultScenario,
    setCookie,
    setServerContext,
    setServerSelectedScenarioIds,
  });

  const { groups, other } = getAllScenarios(scenarioMap, updatedScenarios);

  const html = renderToStaticMarkup(
    <Html
      uiPath={uiPath}
      groups={groups}
      other={other}
      updatedScenarios={updatedScenarios}
    />,
  );

  return '<!DOCTYPE html>\n' + html;
}
