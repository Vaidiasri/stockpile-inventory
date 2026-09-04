import type { Metadata } from "next";

import { Pagination } from "@/components/pagination";
import { AddProductButton } from "@/components/products/add-product-button";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductTable } from "@/components/products/product-table";
import { getSessionUser } from "@/lib/auth";
import { listCategories } from "@/lib/services/categories";
import { listProducts } from "@/lib/services/products";
import { productQuerySchema } from "@/lib/validation/product";

export const metadata: Metadata = { title: "Products - Stockpile" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const raw = await searchParams;

  // Server Components call the service directly. Fetching this app's own REST
  // endpoint over HTTP would be a pointless round trip through its own server;
  // the endpoint exists for external clients and runs this same code.
  const query = productQuerySchema.parse(raw);
  const [{ data: products, meta }, categories, user] = await Promise.all([
    listProducts(query),
    listCategories(),
    getSessionUser(),
  ]);

  // Only the string params matter for building links back to this page.
  const params = Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {meta.total} {meta.total === 1 ? "product" : "products"} in inventory
          </p>
        </div>
        <AddProductButton categories={categories} />
      </div>

      <ProductFilters categories={categories} />

      <ProductTable
        products={products}
        categories={categories}
        canDelete={user?.role === "admin"}
        params={params}
      />

      <Pagination meta={meta} params={params} basePath="/products" />
    </div>
  );
}
