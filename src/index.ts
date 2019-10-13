import { fork } from 'child_process';
import path from 'path';

import { Scenarios, Options } from './types';

export * from './types';

export function run(scenarios: Scenarios, options: Options = {}) {
  let serverProcess = createServer('default');

  return () => {
    serverProcess.kill();
  };

  function createServer(scenario: string) {
    const process = fork(path.join(__dirname, 'start-server'));

    process.send({ scenarios, scenario, options });

    process.on('message', ({ scenario }: { scenario: string }) => {
      process.kill();

      serverProcess = createServer(scenario);
    });

    return process;
  }
}
