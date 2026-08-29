import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
    exclude: ["**/dist/**", "**/node_modules/**"],
  },
});
