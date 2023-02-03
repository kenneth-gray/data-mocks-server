import React from 'react';

import { Groups } from './types';

function Html({
  updatedScenarios,
  uiPath,
  groups,
  other,
}: {
  uiPath: string;
  groups: Groups;
  other: Array<{ id: string; selected: boolean }>;
  updatedScenarios?: string[];
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>
          {updatedScenarios ? 'Updated - ' : ''}Scenarios - Data Mocks Server
        </title>
        <link
          rel="stylesheet"
          href={`${uiPath}${uiPath.slice(-1) === '/' ? '' : '/'}index.css`}
        />
      </head>
      <body>
        <main>
          <ScenarioUpdateInfo updatedScenarios={updatedScenarios} />
          <form className="stack-1" method="POST" action={uiPath}>
            <CallToActionButtons />
            <legend>
              <h1>Scenarios</h1>
            </legend>
            <p>
              <a href={uiPath}>Refresh page</a>
            </p>
            <div className="stack0">
              {groups.map(group => {
                const noneSelected = group.scenarios.every(
                  scenario => !scenario.selected,
                );

                return (
                  <fieldset className="stack-3" key={group.name}>
                    <legend>
                      <h2 className="group-title">{group.name}</h2>
                    </legend>
                    <div className="stack-3">
                      <div>
                        <input
                          type="radio"
                          id={`none-${group.name}`}
                          name={group.name}
                          value=""
                          defaultChecked={noneSelected}
                        />
                        <label htmlFor={`none-${group.name}`}>
                          No &rsquo;{group.name}&rsquo; scenario
                        </label>
                      </div>
                      {group.scenarios.map(scenario => (
                        <div key={scenario.id}>
                          <input
                            type="radio"
                            id={scenario.id}
                            name={group.name}
                            value={scenario.id}
                            defaultChecked={scenario.selected}
                          />
                          <label htmlFor={scenario.id}>{scenario.id}</label>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
              {!other.length ? null : (
                <fieldset className="stack-3">
                  <legend>
                    <h2>Other</h2>
                  </legend>
                  <div className="stack-3">
                    {other.map(scenario => (
                      <div key={scenario.id}>
                        <input
                          type="checkbox"
                          id={scenario.id}
                          name="scenarios"
                          value={scenario.id}
                          defaultChecked={scenario.selected}
                        />
                        <label htmlFor={scenario.id}>{scenario.id}</label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
              <CallToActionButtons />
            </div>
          </form>
        </main>
      </body>
    </html>
  );
}

function ScenarioUpdateInfo({
  updatedScenarios,
}: {
  updatedScenarios?: string[];
}) {
  if (!updatedScenarios) {
    return null;
  }

  if (updatedScenarios.length === 0) {
    return <>All scenarios removed.</>;
  }

  return (
    <>
      Updated to the following scenarios:
      <ul>
        {updatedScenarios.map(scenario => (
          <li key={scenario}>{scenario}</li>
        ))}
      </ul>
    </>
  );
}

function CallToActionButtons() {
  return (
    <div className="button-group">
      <div>
        <button type="submit" name="button" value="modify">
          Modify scenarios
        </button>
        <button type="submit" name="button" value="reset">
          Reset scenarios
        </button>
      </div>
    </div>
  );
}

export { Html };
