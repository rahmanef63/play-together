import { ciTooling } from "./environment/ci-tooling.mjs";
import { convexCloudAuth } from "./environment/convex-cloud-auth.mjs";
import { convexSelfHosted } from "./environment/convex-self-hosted.mjs";
import { internalRuntime } from "./environment/internal-runtime.mjs";
import { localPorts } from "./environment/local-ports.mjs";
import { managedRuntime } from "./environment/managed-runtime.mjs";
import { publicEndpoints } from "./environment/public-endpoints.mjs";
import { sharedSecurity } from "./environment/shared-security.mjs";
import { transactionalEmail } from "./environment/transactional-email.mjs";

export const environmentVariables = [
  ...localPorts,
  ...publicEndpoints,
  ...sharedSecurity,
  ...convexSelfHosted,
  ...convexCloudAuth,
  ...transactionalEmail,
  ...managedRuntime,
  ...ciTooling,
  ...internalRuntime,
];

export const environmentVariableNames = new Set(environmentVariables.map((item) => item.name));

export function localEnvironmentDefaults() {
  return Object.fromEntries(
    environmentVariables
      .filter((item) => ["local", "both"].includes(item.scope))
      .filter((item) => item.local && !item.local.startsWith("<"))
      .map((item) => [item.name, normalizeExampleValue(item.local)]),
  );
}

function normalizeExampleValue(value) {
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}
