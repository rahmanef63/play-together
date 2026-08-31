import { createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env");
const localDirectory = resolve(root, ".local");
const authPath = resolve(localDirectory, "convex-auth.json");
await mkdir(localDirectory, { recursive: true, mode: 0o700 });

const localDefaults = {
  COMPOSE_PROJECT_NAME: "play-together",
  BIND_ADDRESS: "127.0.0.1",
  WEB_PORT: "4173",
  REALTIME_PORT: "8787",
  GAME_CDN_PORT: "8081",
  CONVEX_PORT: "43210",
  CONVEX_SITE_PORT: "43211",
  CONVEX_DASHBOARD_PORT: "46791",
  VITE_CONVEX_URL: "http://convex.localhost:43210",
  VITE_REALTIME_URL: "ws://localhost:8787/v1/connect",
  GAME_CDN_PUBLIC_ORIGIN: "http://localhost:8081",
  ALLOWED_ORIGINS: "http://localhost:4173",
  GAME_MODULE_ORIGINS: "http://localhost:8081",
  GAME_MODULE_FETCH_ORIGIN_MAP: JSON.stringify({
    "http://localhost:8081": "http://game-cdn:8080",
  }),
  ALLOW_INSECURE_GAME_ORIGINS: "true",
  CONVEX_SELF_HOSTED_URL: "http://127.0.0.1:43210",
  CONVEX_INSTANCE_NAME: "play-together-local",
  CONVEX_CLOUD_ORIGIN: "http://convex.localhost:43210",
  CONVEX_SITE_ORIGIN: "http://convex-site.localhost:43211",
  REDACT_LOGS_TO_CLIENT: "true",
  DISABLE_METRICS_ENDPOINT: "false",
  DISABLE_BEACON: "true",
  DOCUMENT_RETENTION_DELAY: "172800",
  ROOM_IDLE_TIMEOUT_MS: "30000",
  MAX_PAYLOAD_BYTES: "65536",
};
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
