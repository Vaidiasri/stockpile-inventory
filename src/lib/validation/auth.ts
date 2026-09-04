import { z } from "zod";

/**
 * Normalise before validating. Chained the other way round
 * (`z.email().trim()`) the format check runs on the raw value, so a trailing
 * space a user did not mean to type is rejected as an invalid address.
 * Lower-casing here is also what lets the plain unique index on users.email
 * behave case-insensitively.
 */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

/**
 * One schema per request, imported by both the route handler and the form via
 * @hookform/resolvers, so client and server validation cannot drift apart.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: emailField,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const loginSchema = z.object({
  email: emailField,
  // Deliberately no length rule: the sign-in form must not advertise the
  // password policy, and an old password that predates a policy change has to
  // still be able to reach the comparison.
  password: z.string().min(1, "Enter your password."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
