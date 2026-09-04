import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "./errors";

export type ApiError = {
  error: { message: string; code: string; fields?: Record<string, string> };
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });
export const created = <T>(data: T) => NextResponse.json({ data }, { status: 201 });
export const paginated = <T>(payload: Paginated<T>) => NextResponse.json(payload);

/**
 * Unique/foreign-key/check constraints are the real validation for these
 * rules, because a pre-flight SELECT would be both slower and racy. This maps
 * the constraint that actually fired onto a field-level message.
 */
const CONSTRAINT_MESSAGES: Record<string, { message: string; fields?: Record<string, string> }> = {
  users_email_key: {
    message: "That email is already registered.",
    fields: { email: "That email is already registered." },
  },
  products_sku_key: {
    message: "That SKU is already in use.",
    fields: { sku: "That SKU is already in use." },
  },
  categories_name_key: {
    message: "A category with that name already exists.",
    fields: { name: "A category with that name already exists." },
  },
  products_quantity_non_negative: { message: "Stock quantity cannot go below zero." },
  products_unit_price_non_negative: { message: "Unit price cannot be negative." },
  products_category_id_categories_id_fk: {
    message: "That category no longer exists.",
    fields: { categoryId: "That category no longer exists." },
  },
};

type PgError = { code: string; constraint?: string };

/**
 * SQLSTATE codes this layer turns into a client-facing response. Anything else
 * is a bug and becomes a 500.
 */
const HANDLED_SQLSTATES: Record<string, number> = {
  "23505": 409, // unique_violation
  "23514": 422, // check_violation
  "23503": 409, // foreign_key_violation
  "23001": 409, // restrict_violation - what ON DELETE RESTRICT actually raises
};

/**
 * Drizzle wraps driver errors in its own Error and hangs the Postgres error off
 * `cause`, so the SQLSTATE is one or more levels down rather than on the thrown
 * object. Verified against Neon: a duplicate insert arrives as
 * `error.cause.code === "23505"`. Matching only on codes we handle avoids
 * mistaking a Node error code (EPIPE and friends are also five characters) for
 * a SQLSTATE.
 */
function findConstraintError(error: unknown, depth = 0): PgError | undefined {
  if (depth > 4 || typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; constraint?: unknown; cause?: unknown };
  if (typeof candidate.code === "string" && candidate.code in HANDLED_SQLSTATES) {
    return candidate as PgError;
  }
  return findConstraintError(candidate.cause, depth + 1);
}

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    // First issue per field wins: forms show one message per input.
    fields[key] ??= issue.message;
  }
  return fields;
}

export function toErrorResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code, fields: error.fields } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: "Some fields need attention.",
          code: "VALIDATION_ERROR",
          fields: zodFields(error),
        },
      },
      { status: 422 },
    );
  }

  const pgError = findConstraintError(error);
  if (pgError) {
    const known = pgError.constraint ? CONSTRAINT_MESSAGES[pgError.constraint] : undefined;
    const status = HANDLED_SQLSTATES[pgError.code];
    return NextResponse.json(
      {
        error: {
          message:
            known?.message ??
            (status === 422
              ? "That value is not allowed."
              : "That value conflicts with existing data."),
          code: status === 422 ? "CHECK_VIOLATION" : "CONFLICT",
          fields: known?.fields,
        },
      },
      { status },
    );
  }

  // Anything unmapped is a bug: log it server-side, tell the client nothing.
  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: { message: "Something went wrong on our end.", code: "INTERNAL_ERROR" } },
    { status: 500 },
  );
}

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: Request, ctx: RouteContext) => Promise<NextResponse>;

/** Wraps a route handler so no handler needs its own try/catch. */
export function withErrors(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
