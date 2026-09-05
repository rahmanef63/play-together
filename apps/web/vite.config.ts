import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootPackage = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  build: {
    target: ["chrome79", "firefox78", "safari14"],
    cssTarget: "chrome79",
    sourcemap: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("./index.html", import.meta.url)),
        gameFrame: fileURLToPath(new URL("./game-frame.html", import.meta.url)),
      },
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Permissions-Policy":
        "fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), camera=(self), microphone=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http: https:; img-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    },
  },
});
