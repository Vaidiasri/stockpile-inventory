import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, inventoryTransactions, products } from "@/db/schema";

export type DashboardStats = {
  totalProducts: number;
  totalCategories: number;
  totalStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryValue: string;
};

/**
 * One round trip. The status counts are `FILTER` aggregates over the generated
 * `status` column, so they cannot disagree with what the products list shows
 * for the same rows.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [row] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      totalStock: sql<number>`coalesce(sum(${products.quantity}), 0)::int`,
      lowStockItems: sql<number>`count(*) filter (where ${products.status} = 'low_stock')::int`,
      outOfStockItems: sql<number>`count(*) filter (where ${products.status} = 'out_of_stock')::int`,
      inventoryValue: sql<string>`coalesce(sum(${products.quantity} * ${products.unitPrice}), 0)::text`,
      totalCategories: sql<number>`(select count(*)::int from ${categories})`,
    })
    .from(products);

  return row;
}

/** Stock on hand grouped by category, for the dashboard chart. */
export async function getStockByCategory() {
  return db
    .select({
      category: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
      products: sql<number>`count(*)::int`,
      quantity: sql<number>`coalesce(sum(${products.quantity}), 0)::int`,
    })
    .from(products)
    .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
    .groupBy(categories.name)
    .orderBy(desc(sql`coalesce(sum(${products.quantity}), 0)`));
}

/** Products needing attention, worst first, for the dashboard shortlist. */
export async function getAttentionList(limit = 6) {
  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      quantity: products.quantity,
      lowStockThreshold: products.lowStockThreshold,
      status: products.status,
    })
    .from(products)
    .where(sql`${products.status} <> 'in_stock'`)
    .orderBy(products.quantity, products.name)
    .limit(limit);
}

export async function getRecentMovements(limit = 6) {
  return db
    .select({
      id: inventoryTransactions.id,
      productName: inventoryTransactions.productName,
      productSku: inventoryTransactions.productSku,
      type: inventoryTransactions.type,
      quantityDelta: inventoryTransactions.quantityDelta,
      createdAt: inventoryTransactions.createdAt,
    })
    .from(inventoryTransactions)
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);
}
