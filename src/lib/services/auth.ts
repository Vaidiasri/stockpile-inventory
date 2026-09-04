import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { unauthorized } from "@/lib/errors";
import { DECOY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/password";
import type { SessionUser } from "@/lib/session";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";

const PUBLIC_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
} as const;

/**
 * The unique index on users.email is the uniqueness check; a duplicate throws
 * Postgres 23505, which lib/api.ts turns into a 409 naming the email field.
 */
export async function registerUser(input: RegisterInput): Promise<SessionUser> {
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    })
    .returning(PUBLIC_COLUMNS);

  return user;
}

export async function authenticateUser(input: LoginInput): Promise<SessionUser> {
  const [record] = await db
    .select({ ...PUBLIC_COLUMNS, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  // Always run a comparison, even with no matching user, so login timing does
  // not reveal which emails exist.
  const valid = await verifyPassword(input.password, record?.passwordHash ?? DECOY_PASSWORD_HASH);
  if (!record || !valid) throw unauthorized("Incorrect email or password.");

  return { id: record.id, email: record.email, name: record.name, role: record.role };
}

export async function findUserById(id: string): Promise<SessionUser | undefined> {
  const [user] = await db.select(PUBLIC_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
  return user;
}
