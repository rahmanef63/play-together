import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const environment = {
  ...(await loadEnvironment(resolve(root, ".env"))),
  ...process.env,
};
const auth = JSON.parse(await readFile(resolve(root, ".local/convex-auth.json"), "utf8"));
const adminKey =
  environment.CONVEX_SELF_HOSTED_ADMIN_KEY ||
  (await readFile(resolve(root, ".local/convex-admin-key"), "utf8")).trim();
const deploymentUrl = environment.CONVEX_SELF_HOSTED_URL || environment.VITE_CONVEX_URL;
if (!deploymentUrl || !adminKey) {
  throw new Error("Convex deployment URL and admin key are required");
}
const changes = [
  { name: "JWT_PRIVATE_KEY", value: auth.privateKey },
  { name: "JWKS", value: JSON.stringify(auth.jwks) },
  { name: "JOIN_TICKET_SECRET", value: required(environment, "JOIN_TICKET_SECRET") },
  { name: "GAME_PUBLISH_TOKEN", value: required(environment, "GAME_PUBLISH_TOKEN") },
  { name: "GAME_MODULE_ORIGINS", value: required(environment, "GAME_MODULE_ORIGINS") },
  {
    name: "GAME_MODULE_FETCH_ORIGIN_MAP",
    value: environment.GAME_MODULE_FETCH_ORIGIN_MAP || "{}",
  },
  {
    name: "ALLOW_INSECURE_GAME_ORIGINS",
    value: environment.ALLOW_INSECURE_GAME_ORIGINS || "false",
  },
  ...optionalChanges(environment, [
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "EMAIL_FROM_ADDRESS",
    "EMAIL_PROJECT_NAME",
    "EMAIL_PROJECT_TAG",
    "EMAIL_REPLY_TO",
    "EMAIL_SITE_URL",
    "RESEND_API_KEY",
  ]),
];
const response = await fetch(
  `${deploymentUrl.replace(/\/$/, "")}/api/update_environment_variables`,
  {
    method: "POST",
    headers: {
      authorization: `Convex ${adminKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ changes }),
  },
);
if (!response.ok) {
  const detail = (await response.text()).slice(0, 500);
  throw new Error(`Convex environment update failed (${response.status}): ${detail}`);
}
console.log("Convex function environment synchronized");

function optionalChanges(environment, keys) {
  return keys.flatMap((name) => {
    const value = environment[name]?.trim();
    return value ? [{ name, value }] : [];
  });
}

function required(environment, key) {
  const value = environment[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

async function loadEnvironment(path) {
  const values = {};
  const content = await readFile(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}
