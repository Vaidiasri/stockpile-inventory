import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { inventoryTransactions, users } from "@/db/schema";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const transactionQuerySchema = z.object({
  productId: z.preprocess(blankToUndefined, z.uuid().optional()),
  type: z.preprocess(blankToUndefined, z.enum(["in", "out", "adjust"]).optional()),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

/**
 * Reads the snapshotted SKU and name rather than joining products, so history
 * stays complete for products that have since been deleted.
 */
export async function listTransactions(query: TransactionQuery) {
  const filters: SQL[] = [];
  if (query.productId) filters.push(eq(inventoryTransactions.productId, query.productId));
  if (query.type) filters.push(eq(inventoryTransactions.type, query.type));

  const rows = await db
    .select({
      id: inventoryTransactions.id,
      productId: inventoryTransactions.productId,
      productSku: inventoryTransactions.productSku,
      productName: inventoryTransactions.productName,
      type: inventoryTransactions.type,
      quantityDelta: inventoryTransactions.quantityDelta,
      quantityAfter: inventoryTransactions.quantityAfter,
      reason: inventoryTransactions.reason,
      userName: users.name,
      createdAt: inventoryTransactions.createdAt,
      total: sql<number>`count(*) over()::int`,
    })
    .from(inventoryTransactions)
    .leftJoin(users, eq(inventoryTransactions.userId, users.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(inventoryTransactions.createdAt), asc(inventoryTransactions.id))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const total = rows[0]?.total ?? 0;

  return {
    data: rows.map(({ total, ...row }) => row),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
