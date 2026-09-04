import { compare, hash } from "bcryptjs";

/**
 * Deliberately not in lib/auth.ts: that module is `server-only` because it
 * reads request cookies, which also makes it unusable from plain Node. Hashing
 * is a pure function the seed script and the test suite both need.
 */
const BCRYPT_COST = 10;

/**
 * Compared against when no user matches the submitted email, so a wrong email
 * and a wrong password take the same amount of time. Without this, response
 * timing tells an attacker which emails are registered.
 */
export const DECOY_PASSWORD_HASH =
  "$2b$10$Z/34Gnrq3A8ay8l/DAdOW.1css0h2EcASWbbOkWyUrYdgs4BPv202";

export const hashPassword = (plain: string) => hash(plain, BCRYPT_COST);

export const verifyPassword = (plain: string, passwordHash: string) => compare(plain, passwordHash);
