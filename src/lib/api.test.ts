import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toErrorResponse } from "./api";
import { conflict, forbidden, notFound } from "./errors";

const body = async (response: Response) => response.json();

describe("error mapping", () => {
  it("maps AppError status and code straight through", async () => {
    const response = toErrorResponse(notFound("Product"));
    expect(response.status).toBe(404);
    expect(await body(response)).toEqual({
      error: { message: "Product not found.", code: "NOT_FOUND" },
    });
  });

  it("returns 403 for role violations", () => {
    expect(toErrorResponse(forbidden()).status).toBe(403);
  });

  it("keeps explicit conflict fields", async () => {
    const response = toErrorResponse(conflict("Nope", { sku: "taken" }));
    expect(response.status).toBe(409);
    expect((await body(response)).error.fields).toEqual({ sku: "taken" });
  });

  // Drizzle does not rethrow the driver error: it wraps it and puts the pg
  // error on `cause`. These fixtures use that real shape, so the mapping
  // cannot pass here while failing against an actual database.
  const drizzleWrapped = (code: string, constraint: string) =>
    new Error(`Failed query: insert into ...`, { cause: { code, constraint } });

  it("finds the SQLSTATE through Drizzle's cause wrapper", async () => {
    const response = toErrorResponse(drizzleWrapped("23505", "products_sku_key"));
    expect(response.status).toBe(409);
    expect((await body(response)).error.fields).toEqual({
      sku: "That SKU is already in use.",
    });
  });

  it("still handles an unwrapped driver error", async () => {
    const response = toErrorResponse({ code: "23505", constraint: "users_email_key" });
    expect(response.status).toBe(409);
    expect((await body(response)).error.fields).toEqual({
      email: "That email is already registered.",
    });
  });

  it("turns the non-negative stock check into a 422", async () => {
    const response = toErrorResponse(
      drizzleWrapped("23514", "products_quantity_non_negative"),
    );
    expect(response.status).toBe(422);
    expect((await body(response)).error.message).toBe("Stock quantity cannot go below zero.");
  });

  it("distinguishes the two ends of the same foreign key", async () => {
    // Deleting a category that still has products (ON DELETE RESTRICT -> 23001)
    const blockedDelete = toErrorResponse(
      drizzleWrapped("23001", "products_category_id_categories_id_fk"),
    );
    expect(blockedDelete.status).toBe(409);
    expect((await body(blockedDelete)).error.message).toBe(
      "This category still has products. Move or delete them first.",
    );

    // Inserting a product against a category that is gone (23503) - same
    // constraint name, opposite meaning.
    const danglingReference = toErrorResponse(
      drizzleWrapped("23503", "products_category_id_categories_id_fk"),
    );
    expect(danglingReference.status).toBe(409);
    expect((await body(danglingReference)).error.message).toBe("That category no longer exists.");
  });

  it("does not mistake a five-character Node error code for a SQLSTATE", () => {
    expect(toErrorResponse({ code: "EPIPE" }).status).toBe(500);
  });

  it("flattens Zod issues to one message per field", async () => {
    const result = z.object({ quantity: z.number().int().nonnegative() }).safeParse({
      quantity: -1,
    });
    const response = toErrorResponse(result.error);
    expect(response.status).toBe(422);
    expect(Object.keys((await body(response)).error.fields)).toEqual(["quantity"]);
  });

  it("never leaks details of an unexpected error", async () => {
    const response = toErrorResponse(new Error("connection string: postgres://secret"));
    expect(response.status).toBe(500);
    expect(await body(response)).toEqual({
      error: { message: "Something went wrong on our end.", code: "INTERNAL_ERROR" },
    });
  });
});
