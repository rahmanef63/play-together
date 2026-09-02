import { createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { localEnvironmentDefaults } from "./environment-manifest.mjs";

const root = process.cwd();
const envPath = resolve(root, ".env");
const localDirectory = resolve(root, ".local");
const authPath = resolve(localDirectory, "convex-auth.json");
await mkdir(localDirectory, { recursive: true, mode: 0o700 });

const localDefaults = localEnvironmentDefaults();
const generatedSecrets = {
  JOIN_TICKET_SECRET: () => randomBytes(48).toString("base64url"),
  GAME_PUBLISH_TOKEN: () => randomBytes(32).toString("base64url"),
  CONVEX_INSTANCE_SECRET: () => randomBytes(32).toString("hex"),
};

let envState = "kept";
let envText = "";
try {
  envText = await readFile(envPath, "utf8");
} catch {
  envState = "created";
}
const existingKeys = new Set(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter(Boolean),
);
const additions = [];
for (const [key, value] of Object.entries(localDefaults)) {
  if (!existingKeys.has(key)) additions.push(formatEnv(key, value));
}
for (const [key, createValue] of Object.entries(generatedSecrets)) {
  if (!existingKeys.has(key)) additions.push(formatEnv(key, createValue()));
}
if (additions.length > 0) {
  const separator = envText && !envText.endsWith("\n") ? "\n" : "";
  envText = `${envText}${separator}${additions.join("\n")}\n`;
  await writeFile(envPath, envText, { mode: 0o600 });
  if (envState === "kept") envState = "migrated";
}

let authCreated = false;
try {
  await readFile(authPath, "utf8");
} catch {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const jwk = createPublicKey(publicKey).export({ format: "jwk" });
  const jwks = {
    keys: [{ ...jwk, alg: "RS256", use: "sig", kid: "play-together-local-1" }],
  };
  await writeFile(authPath, `${JSON.stringify({ privateKey, jwks }, null, 2)}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  authCreated = true;
}

console.log(`Local environment: ${envState}`);
console.log(`Convex auth material: ${authCreated ? "created" : "kept"}`);

function formatEnv(key, value) {
  const text = String(value);
  return text.includes('"') ? `${key}='${text}'` : `${key}=${text}`;
}
