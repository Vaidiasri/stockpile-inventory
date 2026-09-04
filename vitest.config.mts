import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Vite already bundles dotenv; the empty prefix loads every key from .env, not
// just VITE_-prefixed ones. Integration tests need the real DATABASE_URL.
const fileEnv = loadEnv("test", process.cwd(), "");

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests hit a real database, so they are opt-in via
    // `npm run test:db` and stay out of the default (offline, CI-safe) run.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    env: {
      DATABASE_URL:
        fileEnv.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test?sslmode=require",
      JWT_SECRET: fileEnv.JWT_SECRET ?? "test-secret-that-is-long-enough-to-pass-validation",
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
