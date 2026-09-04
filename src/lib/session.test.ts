import { describe, expect, it } from "vitest";

import { signSession, verifySession, type SessionUser } from "./session";
import { loginSchema, registerSchema } from "./validation/auth";

const user: SessionUser = {
  id: "3f1b7b1e-0a3e-4f6a-9a2b-9c0d1e2f3a4b",
  email: "ada@example.com",
  name: "Ada Lovelace",
  role: "admin",
};

describe("session tokens", () => {
  it("round-trips a user through sign and verify", async () => {
    expect(await verifySession(await signSession(user))).toEqual(user);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(user);
    const [header, , signature] = token.split(".");
    // Same signature, different payload: verification must fail.
    const forged = `${header}.${Buffer.from(
      JSON.stringify({ sub: user.id, email: "attacker@example.com", role: "admin" }),
    ).toString("base64url")}.${signature}`;

    expect(await verifySession(forged)).toBeNull();
  });

  it("treats missing or malformed tokens as no session", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("not-a-jwt")).toBeNull();
  });

  it("never lets an unknown role escalate to admin", async () => {
    const token = await signSession({ ...user, role: "staff" });
    expect((await verifySession(token))?.role).toBe("staff");
  });
});

describe("auth validation", () => {
  it("normalises email so the unique index is case-insensitive", () => {
    const parsed = registerSchema.parse({
      name: "  Ada Lovelace  ",
      email: "  Ada@Example.COM ",
      password: "supersecret",
    });
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.name).toBe("Ada Lovelace");
  });

  it("rejects short passwords and bad emails with usable messages", () => {
    const result = registerSchema.safeParse({ name: "A", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((i) => i.path.join("."));
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("does not impose a length rule on the login password", () => {
    // Sign-in must not leak the password policy; only "is it empty" matters.
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
