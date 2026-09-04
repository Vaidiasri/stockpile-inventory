import { SignJWT, jwtVerify } from "jose";

import { env } from "./env";
import type { User } from "@/db/schema";

export const SESSION_COOKIE = "inv_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type SessionUser = Pick<User, "id" | "email" | "name" | "role">;

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role === "admin" ? "admin" : "staff",
    };
  } catch {
    // Expired, tampered with, or signed by an old JWT_SECRET: all "no session".
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
} as const;
