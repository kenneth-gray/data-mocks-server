import { transform } from 'server-with-kill';

import { createExpressApp } from './server';
import { Options, ScenarioMap, DefaultScenario } from './types';

export { run };

function run({
  default: defaultScenario,
  scenarios: scenarioMap = {},
  options = {},
}: {
  default: DefaultScenario;
  scenarios?: ScenarioMap;
  options?: Options;
}) {
  const { port = 3000 } = options;
  const app = createExpressApp({
    default: defaultScenario,
    scenarios: scenarioMap,
    options,
  });
  return transform(
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }),
  );
}
