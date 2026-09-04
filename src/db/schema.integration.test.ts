/**
 * Runs against a real Postgres (`npm run test:db`), because everything it
 * asserts is enforced by the database rather than by application code -- a
 * mock would only prove that the mock agrees with itself.
 *
 * Excluded from `npm test` so the default suite stays offline and CI-safe.
 */
import { eq, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "./index";
import { categories, products } from "./schema";

const PREFIX = "ITEST-";
const CATEGORY = "__integration_test__";

let categoryId: string;

/** Drizzle wraps the driver error, so the SQLSTATE hangs off `cause`. */
const sqlstateOf = (error: unknown): string | undefined => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e.cause?.code ?? e.code;
};

const constraintOf = (error: unknown): string | undefined => {
  const e = error as { constraint?: string; cause?: { constraint?: string } };
  return e.cause?.constraint ?? e.constraint;
};

async function cleanup() {
  await db.delete(products).where(like(products.sku, `${PREFIX}%`));
  await db.delete(categories).where(like(categories.name, `${CATEGORY}%`));
}

beforeAll(async () => {
  await cleanup();
  const [category] = await db
    .insert(categories)
    .values({ name: CATEGORY, description: "Created and removed by the test suite" })
    .returning({ id: categories.id });
  categoryId = category.id;
});

afterAll(cleanup);

describe("products.status generated column", () => {
  it.each([
    { quantity: 0, threshold: 10, expected: "out_of_stock" },
    { quantity: 1, threshold: 10, expected: "low_stock" },
    { quantity: 10, threshold: 10, expected: "low_stock" },
    { quantity: 11, threshold: 10, expected: "in_stock" },
    // With a zero threshold, zero stock must still read out_of_stock rather
    // than low_stock: the quantity <= 0 branch has to be evaluated first.
    { quantity: 0, threshold: 0, expected: "out_of_stock" },
    { quantity: 1, threshold: 0, expected: "in_stock" },
  ])(
    "quantity $quantity against threshold $threshold is $expected",
    async ({ quantity, threshold, expected }) => {
      const [row] = await db
        .insert(products)
        .values({
          name: `Fixture ${quantity}/${threshold}`,
          sku: `${PREFIX}${quantity}-${threshold}`,
          categoryId,
          quantity,
          lowStockThreshold: threshold,
        })
        .returning({ status: products.status });

      expect(row.status).toBe(expected);
    },
  );

  it("recomputes on update, with no application code involved", async () => {
    const sku = `${PREFIX}RECOMPUTE`;
    await db
      .insert(products)
      .values({ name: "Recompute", sku, categoryId, quantity: 100, lowStockThreshold: 10 });

    const readStatus = async () => {
      const [row] = await db
        .select({ status: products.status })
        .from(products)
        .where(eq(products.sku, sku));
      return row.status;
    };

    expect(await readStatus()).toBe("in_stock");

    await db.update(products).set({ quantity: 4 }).where(eq(products.sku, sku));
    expect(await readStatus()).toBe("low_stock");

    await db.update(products).set({ quantity: 0 }).where(eq(products.sku, sku));
    expect(await readStatus()).toBe("out_of_stock");
  });

  it("rejects a direct write, so status can never be spoofed by a client", async () => {
    const sku = `${PREFIX}READONLY`;
    await db.insert(products).values({ name: "Readonly", sku, categoryId, quantity: 0 });

    await expect(
      db.execute(sql`update products set status = 'in_stock' where sku = ${sku}`),
    ).rejects.toSatisfy((error) => sqlstateOf(error) === "428C9");
  });
});

describe("stock cannot go negative", () => {
  const sku = `${PREFIX}NEGATIVE`;

  beforeAll(async () => {
    await db.insert(products).values({ name: "Negative", sku, categoryId, quantity: 5 });
  });

  it("rejects a direct negative quantity", async () => {
    await expect(
      db.update(products).set({ quantity: -1 }).where(eq(products.sku, sku)),
    ).rejects.toSatisfy((error) => sqlstateOf(error) === "23514");
  });

  it("rejects an atomic decrement that would cross zero", async () => {
    // The path a concurrent stock-out takes, where an application-level
    // read-then-check would race against another request.
    await expect(
      db
        .update(products)
        .set({ quantity: sql`${products.quantity} - 9999` })
        .where(eq(products.sku, sku)),
    ).rejects.toSatisfy((error) => sqlstateOf(error) === "23514");
  });

  it("allows a decrement that lands exactly on zero", async () => {
    await db
      .update(products)
      .set({ quantity: sql`${products.quantity} - 5` })
      .where(eq(products.sku, sku));

    const [row] = await db
      .select({ quantity: products.quantity, status: products.status })
      .from(products)
      .where(eq(products.sku, sku));

    expect(row).toEqual({ quantity: 0, status: "out_of_stock" });
  });
});

describe("uniqueness and referential integrity", () => {
  it("rejects a duplicate SKU with the constraint the API maps to a 409", async () => {
    const sku = `${PREFIX}DUPLICATE`;
    await db.insert(products).values({ name: "First", sku, categoryId, quantity: 1 });

    await expect(
      db.insert(products).values({ name: "Second", sku, categoryId, quantity: 1 }),
    ).rejects.toSatisfy(
      (error) => sqlstateOf(error) === "23505" && constraintOf(error) === "products_sku_key",
    );
  });

  it("rejects a duplicate category name", async () => {
    await expect(db.insert(categories).values({ name: CATEGORY })).rejects.toSatisfy(
      (error) => sqlstateOf(error) === "23505" && constraintOf(error) === "categories_name_key",
    );
  });

  it("refuses to delete a category that still has products", async () => {
    // ON DELETE RESTRICT raises 23001, not the 23503 a plain foreign key
    // would. lib/api.ts maps both.
    await expect(db.delete(categories).where(eq(categories.id, categoryId))).rejects.toSatisfy(
      (error) => sqlstateOf(error) === "23001",
    );
  });

  it("allows deleting a category once nothing references it", async () => {
    const [spare] = await db
      .insert(categories)
      .values({ name: `${CATEGORY}-spare` })
      .returning({ id: categories.id });

    await expect(db.delete(categories).where(eq(categories.id, spare.id))).resolves.toBeDefined();
  });
});

describe("seed data", () => {
  it("covers all three stock states, so the dashboard is never empty", async () => {
    const rows = await db
      .select({ status: products.status, total: sql<number>`count(*)::int` })
      .from(products)
      .where(sql`${products.sku} not like ${`${PREFIX}%`}`)
      .groupBy(products.status);

    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.total]));
    expect(byStatus.in_stock).toBeGreaterThan(0);
    expect(byStatus.low_stock).toBeGreaterThan(0);
    expect(byStatus.out_of_stock).toBeGreaterThan(0);
  });
});
