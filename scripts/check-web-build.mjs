import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const assets = resolve(root, "apps/web/dist/assets");
const files = await readdir(assets);
const mainMap = files.find((file) => /^app-.*\.js\.map$/.test(file));
const mainJs = files.find((file) => /^app-.*\.js$/.test(file));
if (!mainMap || !mainJs) throw new Error("Web build has no main app chunk/source map");
const sourceMap = JSON.parse(await readFile(resolve(assets, mainMap), "utf8"));
const requiredSources = [
  "src/features/auth/AuthPage.tsx",
  "src/features/lobby/LobbyPage.tsx",
  "src/shared/AppDock.tsx",
  "src/shared/PwaUpdateToast.tsx",
  "src/app/App.tsx",
];
for (const required of requiredSources) {
  if (!sourceMap.sources.some((source) => source.endsWith(required))) {
    throw new Error(`Web build is incomplete: ${required} was tree-shaken from the main app chunk`);
  }
}
const lazyPrefixes = ["OpsPage-", "PlayPage-", "RoomPage-", "TemplatesPage-", "DevelopersPage-"];
for (const prefix of lazyPrefixes) {
  if (!files.some((file) => file.startsWith(prefix) && file.endsWith(".js"))) {
    throw new Error(`Web build lost expected lazy route chunk ${prefix}*.js`);
  }
}
const mainBytes = (await stat(resolve(assets, mainJs))).size;
if (mainBytes > 420_000)
  throw new Error(`Initial app chunk grew beyond the 420 KB raw budget: ${mainBytes}`);
console.log(
  `Web build completeness: OK (${mainBytes} byte main chunk, ${lazyPrefixes.length} lazy routes)`,
);
