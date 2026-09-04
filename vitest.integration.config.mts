import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const fileEnv = loadEnv("test", process.cwd(), "");

/**
 * Only the tests that need a real database. Standalone rather than merged with
 * vitest.config.mts, because `mergeConfig` concatenates array options -- the
 * base config's exclusion of `*.integration.test.ts` would survive the merge
 * and silently select nothing.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    // Shared fixtures in one database: parallel files would collide.
    fileParallelism: false,
    env: {
      DATABASE_URL: fileEnv.DATABASE_URL ?? "",
      JWT_SECRET: fileEnv.JWT_SECRET ?? "test-secret-that-is-long-enough-to-pass-validation",
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
