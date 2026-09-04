import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { forbidden, unauthorized } from "./errors";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionUser,
} from "./session";

/** Current user, or null. Safe to call from Server Components and handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Authorisation, checked inside every protected handler. proxy.ts only
 * *routes* unauthenticated visitors to /login; it is not the security
 * boundary, so the boundary lives here where the work happens.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw forbidden("This action is restricted to administrators.");
  return user;
}

export async function attachSession<T>(
  response: NextResponse<T>,
  user: SessionUser,
): Promise<NextResponse<T>> {
  response.cookies.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions);
  return response;
}

export function clearSession<T>(response: NextResponse<T>): NextResponse<T> {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
