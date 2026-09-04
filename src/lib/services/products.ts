import { and, asc, desc, eq, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { categories, inventoryTransactions, products, type StockStatus } from "@/db/schema";
import { notFound } from "@/lib/errors";
import type {
  ProductCreateInput,
  ProductQuery,
  ProductUpdateInput,
  StockAdjustInput,
} from "@/lib/validation/product";

/** The shape every product endpoint returns, category resolved to its name. */
const productColumns = {
  id: products.id,
  name: products.name,
  sku: products.sku,
  categoryId: products.categoryId,
  categoryName: categories.name,
  description: products.description,
  quantity: products.quantity,
  unitPrice: products.unitPrice,
  supplierName: products.supplierName,
  lowStockThreshold: products.lowStockThreshold,
  imageUrl: products.imageUrl,
  status: products.status,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
} as const;

/**
 * Written out rather than derived from the column map: this is the public API
 * contract, and a mapped type cannot express that the left join makes
 * `categoryName` nullable.
 */
export type ProductRecord = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  quantity: number;
  unitPrice: string;
  supplierName: string | null;
  lowStockThreshold: number;
  imageUrl: string | null;
  status: StockStatus;
  createdAt: Date;
  updatedAt: Date;
};

const SORT_COLUMNS = {
  name: products.name,
  sku: products.sku,
  quantity: products.quantity,
  unitPrice: products.unitPrice,
  createdAt: products.createdAt,
} as const;

/**
 * `%`, `_` and `\` are wildcards to LIKE, so a search for "50%" would match
 * far more than intended. Escaped here and declared with ESCAPE below.
 */
const escapeLike = (term: string) => term.replace(/[\\%_]/g, (char) => `\\${char}`);

export async function listProducts(query: ProductQuery) {
  const filters: SQL[] = [];

  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    // Search by name OR SKU, per the requirement.
    filters.push(
      or(
        sql`${products.name} ilike ${pattern} escape '\\'`,
        sql`${products.sku} ilike ${pattern} escape '\\'`,
      )!,
    );
  }
  if (query.category) filters.push(eq(products.categoryId, query.category));
  if (query.status) filters.push(eq(products.status, query.status));

  const where = filters.length ? and(...filters) : undefined;
  const direction = query.order === "asc" ? asc : desc;
  const sortColumn = SORT_COLUMNS[query.sort];

  const rows = await db
    .select({
      ...productColumns,
      // A window function gives the pre-pagination total in the same round
      // trip, and cannot disagree with the page the way a separate COUNT
      // query can under concurrent writes.
      total: sql<number>`count(*) over()::int`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    // Tie-break on id so pagination is stable when the sort key repeats.
    .orderBy(direction(sortColumn), asc(products.id))
    .where(where)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const total = rows[0]?.total ?? 0;

  return {
    // Strip the window-function column; it belongs in meta, not each row.
    data: rows.map(({ total, ...product }) => product),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getProduct(id: string): Promise<ProductRecord> {
  const [product] = await db
    .select(productColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!product) throw notFound("Product");
  return product;
}

/**
 * Opening stock is recorded as a transaction in the same database transaction
 * as the insert, so a product never exists with stock that has no audit row.
 */
export async function createProduct(
  input: ProductCreateInput,
  userId: string,
): Promise<ProductRecord> {
  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values(input)
      .returning({ id: products.id, sku: products.sku, name: products.name });

    if (input.quantity > 0) {
      await tx.insert(inventoryTransactions).values({
        productId: created.id,
        productSku: created.sku,
        productName: created.name,
        type: "in",
        quantityDelta: input.quantity,
        quantityAfter: input.quantity,
        reason: "Opening stock",
        userId,
      });
    }

    return created.id;
  });

  return getProduct(id);
}

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<ProductRecord> {
  const [updated] = await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning({ id: products.id });

  if (!updated) throw notFound("Product");
  return getProduct(id);
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id });

  if (!deleted) throw notFound("Product");
  return deleted;
}

/**
 * Stock movement. Two guarantees, both from the database rather than from
 * checks here:
 *
 * - The quantity is changed with `quantity = quantity + delta` in SQL, so two
 *   concurrent stock-outs cannot both pass a check against a stale read.
 * - `CHECK (quantity >= 0)` rejects anything that would go negative, which
 *   surfaces as a 422 rather than corrupt data.
 *
 * The audit row is written in the same transaction, so stock and history can
 * never disagree.
 */
export async function adjustStock(
  id: string,
  input: StockAdjustInput,
  userId: string,
): Promise<ProductRecord> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ sku: products.sku, name: products.name, quantity: products.quantity })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!current) throw notFound("Product");

    const isAbsolute = input.quantity !== undefined;
    const delta = isAbsolute ? input.quantity! - current.quantity : input.delta!;

    if (delta === 0) {
      // An absolute set that matches the current count: nothing moved, so
      // there is nothing to audit. Returning early also avoids tripping the
      // non-zero-delta check constraint on the audit table.
      return;
    }

    const [updated] = await tx
      .update(products)
      .set({
        quantity: isAbsolute ? input.quantity! : sql`${products.quantity} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning({ quantity: products.quantity });

    await tx.insert(inventoryTransactions).values({
      productId: id,
      productSku: current.sku,
      productName: current.name,
      type: isAbsolute ? "adjust" : delta > 0 ? "in" : "out",
      quantityDelta: delta,
      quantityAfter: updated.quantity,
      reason: input.reason ?? null,
      userId,
    });
  });

  return getProduct(id);
}
