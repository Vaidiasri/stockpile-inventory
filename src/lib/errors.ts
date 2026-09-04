/**
 * The single error type services throw. Route handlers never build status
 * codes by hand: `toErrorResponse` in lib/api.ts maps this (and Postgres and
 * Zod errors) to HTTP.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError(400, message, "BAD_REQUEST", fields);

export const unauthorized = (message = "You must be signed in to do that.") =>
  new AppError(401, message, "UNAUTHORIZED");

export const forbidden = (message = "You do not have permission to do that.") =>
  new AppError(403, message, "FORBIDDEN");

export const notFound = (what = "Resource") =>
  new AppError(404, `${what} not found.`, "NOT_FOUND");

export const conflict = (message: string, fields?: Record<string, string>) =>
  new AppError(409, message, "CONFLICT", fields);

export const unprocessable = (message: string, fields?: Record<string, string>) =>
  new AppError(422, message, "UNPROCESSABLE_ENTITY", fields);
