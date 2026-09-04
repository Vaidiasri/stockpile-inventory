import { asc, eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { notFound } from "@/lib/errors";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/validation/category";

export type CategoryRecord = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const withCount = {
  id: categories.id,
  name: categories.name,
  description: categories.description,
  // count() over the joined column, not count(*): a LEFT JOIN produces one
  // all-null row for a category with no products, and count(column) skips
  // nulls, so empty categories correctly report 0 while still appearing.
  //
  // Written as a join rather than a correlated subquery because Drizzle
  // renders bare column references inside a raw `sql` template unqualified --
  // `where "category_id" = "id"` resolved both names against products and
  // silently counted zero every time.
  productCount: sql<number>`count(${products.id})::int`,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
} as const;

const categoriesWithCount = (where?: SQL) =>
  db
    .select(withCount)
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(where)
    .groupBy(categories.id);

export async function listCategories(): Promise<CategoryRecord[]> {
  return categoriesWithCount().orderBy(asc(categories.name));
}

export async function getCategory(id: string): Promise<CategoryRecord> {
  const [category] = await categoriesWithCount(eq(categories.id, id));
  if (!category) throw notFound("Category");
  return category;
}

export async function createCategory(input: CategoryCreateInput): Promise<CategoryRecord> {
  const [created] = await db.insert(categories).values(input).returning({ id: categories.id });
  return getCategory(created.id);
}

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<CategoryRecord> {
  const [updated] = await db
    .update(categories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  if (!updated) throw notFound("Category");
  return getCategory(id);
}

/**
 * No pre-flight count: `ON DELETE RESTRICT` on products.category_id is the
 * check, and it raises SQLSTATE 23001, which lib/api.ts turns into a 409. A
 * count-then-delete would be both slower and racy.
 */
export async function deleteCategory(id: string): Promise<{ id: string }> {
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  if (!deleted) throw notFound("Category");
  return deleted;
}
