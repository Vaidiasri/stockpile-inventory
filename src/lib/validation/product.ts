import { z } from "zod";

import { STOCK_STATUSES } from "@/db/schema";

/**
 * Normalise before validating throughout: chained the other way round, the
 * format check runs on the raw value and rejects input the user did not mean
 * to type (a trailing space, a lower-case SKU).
 */
const skuField = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(
    z
      .string()
      .min(2, "SKU must be at least 2 characters.")
      .max(64, "SKU must be 64 characters or fewer.")
      .regex(
        /^[A-Z0-9][A-Z0-9._-]*$/,
        "Use letters, digits, dots, dashes and underscores only.",
      ),
  );

const nameField = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(200, "Name must be 200 characters or fewer.");

/**
 * `unit_price` is `numeric(12,2)` in Postgres and Drizzle exchanges it as a
 * string, so the boundary converts once here rather than leaving every caller
 * to guess. Never a float: money must not accumulate binary rounding error.
 */
const priceField = z.coerce
  .number({ error: "Enter a valid price." })
  .min(0, "Price cannot be negative.")
  .max(9_999_999_999.99, "Price is too large.")
  .transform((value) => value.toFixed(2));

const quantityField = z.coerce
  .number({ error: "Enter a whole number." })
  .int("Quantity must be a whole number.")
  .min(0, "Quantity cannot be negative.")
  .max(1_000_000_000, "Quantity is too large.");

const thresholdField = z.coerce
  .number({ error: "Enter a whole number." })
  .int("Threshold must be a whole number.")
  .min(0, "Threshold cannot be negative.")
  .max(1_000_000_000, "Threshold is too large.");

/** Empty text inputs post as "", which for a nullable column means "unset". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => value || null)
    .nullish();

const editableFields = {
  name: nameField,
  sku: skuField,
  categoryId: z.uuid("Choose a valid category.").nullish(),
  description: optionalText(2000),
  unitPrice: priceField,
  supplierName: optionalText(200),
  lowStockThreshold: thresholdField,
  imageUrl: z.url("Enter a valid image URL.").nullish(),
};

export const productCreateSchema = z.object({
  ...editableFields,
  quantity: quantityField.default(0),
  unitPrice: priceField.default("0.00"),
  lowStockThreshold: thresholdField.default(10),
});

/**
 * `quantity` is deliberately absent: every stock change goes through
 * POST /api/products/[id]/stock so it always leaves an audit row behind. A
 * PATCH that could set quantity directly would be a hole in the trail.
 */
export const productUpdateSchema = z
  .object(editableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const PRODUCT_SORT_FIELDS = ["name", "sku", "quantity", "unitPrice", "createdAt"] as const;

/** Query strings arrive as "" when a select is cleared; treat that as absent. */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const productQuerySchema = z.object({
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  category: z.preprocess(blankToUndefined, z.uuid().optional()),
  status: z.preprocess(blankToUndefined, z.enum(STOCK_STATUSES).optional()),
  sort: z.preprocess(blankToUndefined, z.enum(PRODUCT_SORT_FIELDS).default("createdAt")),
  order: z.preprocess(blankToUndefined, z.enum(["asc", "desc"]).default("desc")),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(10)),
});

export const stockAdjustSchema = z
  .object({
    // Relative movement (receive stock, ship stock).
    delta: z.coerce.number().int().optional(),
    // Absolute correction after a physical count.
    quantity: quantityField.optional(),
    reason: optionalText(200),
  })
  .refine((value) => (value.delta === undefined) !== (value.quantity === undefined), {
    message: "Send either a relative delta or an absolute quantity, not both.",
  })
  .refine((value) => value.delta !== 0, {
    message: "Enter an amount other than zero.",
    path: ["delta"],
  });

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
