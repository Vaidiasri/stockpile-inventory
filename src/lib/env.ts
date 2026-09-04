import { z } from "zod";

/**
 * Fail fast at boot rather than at the first query with a confusing driver
 * error. Parsed once at module load; every consumer imports the typed result.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (see .env.example)"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
