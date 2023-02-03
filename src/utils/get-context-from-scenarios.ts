import { Context, Scenario } from '../types';

export { getContextFromScenarios };

function getContextFromScenarios(scenarios: Scenario[]) {
  let context: Context = {};
  scenarios.forEach(mock => {
    if (!Array.isArray(mock) && mock.context) {
      context = { ...context, ...mock.context };
    }
  });

  return context;
}
