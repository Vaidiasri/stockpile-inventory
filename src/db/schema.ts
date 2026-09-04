import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "staff"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["in", "out", "adjust"]);

/**
 * `products.status` is a Postgres generated column, so it is kept as `text`
 * with a TypeScript-level union instead of a pg enum: a generated expression
 * would need an explicit enum cast, and widening a pg enum later needs a
 * migration that Postgres will not run inside a transaction.
 */
export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Always stored lower-cased by the auth service, so a plain unique index
    // gives case-insensitive uniqueness without a functional index.
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_name_key").on(t.name)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    // RESTRICT, not CASCADE: deleting a category must not silently delete the
    // products in it. The API turns the resulting FK error into a 409.
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    description: text("description"),
    quantity: integer("quantity").notNull().default(0),
    // numeric, never float: money must not accumulate binary rounding error.
    // Drizzle returns this as a string, which the UI formats for display.
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    supplierName: text("supplier_name"),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    imageUrl: text("image_url"),
    /**
     * Derived by Postgres, so it can never drift from `quantity` no matter
     * which code path writes stock, and it stays indexable for status filters
     * and the dashboard counts.
     */
    status: text("status")
      .$type<StockStatus>()
      .notNull()
      .generatedAlwaysAs(
        (): SQL => sql`case
      when ${products.quantity} <= 0 then 'out_of_stock'
      when ${products.quantity} <= ${products.lowStockThreshold} then 'low_stock'
      else 'in_stock'
    end`,
      ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_sku_key").on(t.sku),
    index("products_category_id_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
    // Supports ORDER BY name. Name/SKU *search* is ILIKE '%q%' and cannot use
    // this index.
    // ponytail: sequential scan on search; add a pg_trgm GIN index if the
    // catalogue grows past roughly 50k rows.
    index("products_name_idx").on(t.name),
    check("products_quantity_non_negative", sql`${t.quantity} >= 0`),
    check("products_unit_price_non_negative", sql`${t.unitPrice} >= 0`),
    check("products_low_stock_threshold_non_negative", sql`${t.lowStockThreshold} >= 0`),
  ],
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    /**
     * Audit rows must stay readable after a product is deleted, so identity is
     * snapshotted here. This is the one deliberate denormalisation in the
     * schema.
     */
    productSku: text("product_sku").notNull(),
    productName: text("product_name").notNull(),
    type: transactionTypeEnum("type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    reason: text("reason"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_transactions_product_id_idx").on(t.productId, t.createdAt.desc()),
    index("inventory_transactions_created_at_idx").on(t.createdAt.desc()),
    check("inventory_transactions_delta_non_zero", sql`${t.quantityDelta} <> 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
