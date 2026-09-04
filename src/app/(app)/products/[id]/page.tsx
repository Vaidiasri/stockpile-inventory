import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { StatusBadge } from "@/components/products/status-badge";
import { ProductActions } from "@/components/products/product-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppError } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { listCategories } from "@/lib/services/categories";
import { listTransactions } from "@/lib/services/inventory";
import { getProduct } from "@/lib/services/products";

export const metadata: Metadata = { title: "Product - Stockpile" };

const MOVEMENT_LABELS = { in: "Stock in", out: "Stock out", adjust: "Correction" } as const;

export default async function ProductDetailPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch (error) {
    // A bad id is a 404 page, not a 500.
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const [{ data: movements }, categories, user] = await Promise.all([
    listTransactions({ productId: id, page: 1, limit: 20 }),
    listCategories(),
    getSessionUser(),
  ]);

  // Rendered on the server as a data URI: no QR library reaches the browser.
  const qrCode = await QRCode.toString(product.sku, {
    type: "svg",
    margin: 1,
    color: { light: "#0000" },
  });

  const details = [
    { label: "SKU", value: product.sku, mono: true },
    { label: "Category", value: product.categoryName ?? "Uncategorised" },
    { label: "Supplier", value: product.supplierName ?? "Not recorded" },
    { label: "Unit price", value: formatCurrency(product.unitPrice) },
    { label: "In stock", value: `${product.quantity}` },
    { label: "Low stock at", value: `${product.lowStockThreshold} or fewer` },
    {
      label: "Stock value",
      value: formatCurrency(Number(product.unitPrice) * product.quantity),
    },
    { label: "Added", value: formatDateTime(product.createdAt) },
    { label: "Last updated", value: formatDateTime(product.updatedAt) },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          nativeButton={false}
          render={
            <Link href="/products">
              <ArrowLeft className="size-3.5" aria-hidden />
              All products
            </Link>
          }
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
              <StatusBadge status={product.status} />
            </div>
            {product.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{product.description}</p>
            ) : null}
          </div>
          <ProductActions
            product={product}
            categories={categories}
            canDelete={user?.role === "admin"}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label} className="grid gap-0.5">
                  <dt className="text-xs text-muted-foreground">{detail.label}</dt>
                  <dd className={detail.mono ? "font-mono text-sm" : "text-sm"}>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-6 content-start">
          {product.imageUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="aspect-square w-full rounded-md border object-cover"
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>QR code</CardTitle>
            </CardHeader>
            <CardContent className="grid justify-items-center gap-2">
              <div
                className="w-40 [&_svg]:h-auto [&_svg]:w-full [&_svg]:text-foreground"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <p className="text-center text-xs text-muted-foreground">
                Encodes <span className="font-mono">{product.sku}</span> for scanning during a
                stocktake.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock history</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="hidden sm:table-cell">Reason</TableHead>
                    <TableHead className="hidden md:table-cell">By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="sm:hidden">{formatDate(movement.createdAt)}</span>
                        <span className="hidden sm:inline">
                          {formatDateTime(movement.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>{MOVEMENT_LABELS[movement.type]}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          movement.quantityDelta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {movement.quantityAfter}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {movement.reason ?? "-"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {movement.userName ?? "Deleted user"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
