import { createRequire } from "node:module";
import { resolve } from "node:path";
export async function createPreviewHarness(root) {
  const require = createRequire(resolve(root, "apps/web/package.json"));
  const { createServer } = await import(require.resolve("vite"));
  const server = await createServer({
    configFile: false,
    root: resolve(root, "apps/web"),
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
    plugins: [
      {
        name: "game-preview",
        configureServer(vite) {
          vite.middlewares.use((request, response, next) => {
            if (request.url !== "/__game_preview__") return next();
            response.setHeader("Content-Type", "text/html");
            response.end(
              '<!doctype html><html><head><style>html,body,#game-root{width:100%;height:100%;margin:0;overflow:hidden;background:#111820}*{box-sizing:border-box}</style></head><body><div id="game-root"></div></body></html>',
            );
          });
        },
      },
    ],
  });
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === "string") throw new Error("No preview port");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}
