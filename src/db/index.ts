import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * The WebSocket driver (`neon-serverless`), not the HTTP one (`neon-http`):
 * the HTTP driver cannot run interactive transactions, and a stock adjustment
 * has to write the product row and its audit row atomically.
 *
 * Cached on globalThis so Next.js hot reloads reuse one pool instead of
 * leaking a new one on every edit.
 */
const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

const pool = globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL });

if (env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool, schema });
export { schema };
