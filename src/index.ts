import { fork } from 'child_process';
import path from 'path';

import { Scenarios, Options, Mock } from './types';

export * from './types';

type Input = {
  default: Mock[];
  scenarios?: Scenarios;
  options?: Options;
};

export function run({
  default: defaultScenario,
  scenarios = {},
  options = {},
}: Input) {
  let serverProcess = createServer([]);

  return () => {
    serverProcess.kill();
  };

  function createServer(selectedScenarios: string[]) {
    const process = fork(path.join(__dirname, 'start-server'));

    process.send({
      defaultScenario,
      scenarios,
      selectedScenarios,
      options,
    });

    process.on('message', (scenarios: string[]) => {
      process.kill();

      serverProcess = createServer(scenarios);
    });

    return process;
  }
}
