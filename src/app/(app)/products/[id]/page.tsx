import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { ProductActions } from "@/components/products/product-actions";
import { StatusBadge } from "@/components/products/status-badge";
import { StockDelta } from "@/components/stock-delta";
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
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
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

  // Rendered on the server as inline SVG: no QR library reaches the browser.
  const qrCode = await QRCode.toString(product.sku, {
    type: "svg",
    margin: 1,
    color: { light: "#0000" },
  });

  /**
   * The four figures a controller came here for, in the same hairline-strip
   * vocabulary the dashboard uses for its reference numbers. Previously these
   * were nine equal-weight label/value pairs in which the stock quantity —
   * the whole point of the page — was no louder than the supplier name.
   */
  const figures = [
    { label: "On hand", value: String(product.quantity), lead: true },
    { label: "Reorder at", value: `${product.lowStockThreshold} or fewer` },
    { label: "Unit price", value: formatCurrency(product.unitPrice) },
    {
      label: "Stock value",
      value: formatCurrency(Number(product.unitPrice) * product.quantity),
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          nativeButton={false}
          render={
            <Link href="/products">
              <ArrowLeft className="size-3.5" aria-hidden />
              All products
            </Link>
          }
        />

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
              <StatusBadge status={product.status} />
            </div>
            {/* Identity line: the three things that name this item. */}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{product.sku}</span>
              <span aria-hidden>&middot;</span>
              <span>{product.categoryName ?? "Uncategorised"}</span>
              {product.supplierName ? (
                <>
                  <span aria-hidden>&middot;</span>
                  <span>{product.supplierName}</span>
                </>
              ) : null}
            </p>
          </div>
          <ProductActions
            product={product}
            categories={categories}
            canDelete={user?.role === "admin"}
          />
        </div>

        {product.description ? (
          <p className="max-w-[70ch] text-sm text-muted-foreground">{product.description}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {figures.map(({ label, value, lead }) => (
          <div key={label} className="grid gap-0.5 bg-background p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd
              className={
                lead
                  ? "text-metric text-foreground"
                  : "truncate text-lg font-semibold tabular-nums"
              }
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="-mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>
          Added{" "}
          <time dateTime={new Date(product.createdAt).toISOString()}>
            {formatDateTime(product.createdAt)}
          </time>
        </span>
        <span aria-hidden>&middot;</span>
        <span>
          Last updated{" "}
          <time dateTime={new Date(product.updatedAt).toISOString()}>
            {formatDateTime(product.updatedAt)}
          </time>
        </span>
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
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
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="hidden md:table-cell">Reason</TableHead>
                      <TableHead className="hidden lg:table-cell">By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id} className="transition-colors hover:bg-accent">
                        <TableCell className="text-xs text-muted-foreground">
                          <time
                            dateTime={new Date(movement.createdAt).toISOString()}
                            title={formatDateTime(movement.createdAt)}
                          >
                            <span className="sm:hidden">{formatDate(movement.createdAt)}</span>
                            <span className="hidden sm:inline">
                              {formatDateTime(movement.createdAt)}
                            </span>
                          </time>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {MOVEMENT_LABELS[movement.type]}
                        </TableCell>
                        <TableCell className="text-right">
                          <StockDelta value={movement.quantityDelta} />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {movement.quantityAfter}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {movement.reason ?? "-"}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
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

        <div className="grid content-start gap-6">
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
              <CardTitle>Label</CardTitle>
            </CardHeader>
            <CardContent className="grid justify-items-center gap-2">
              {/* Sized as a scanning aid, not as the focus of the page. */}
              <div
                className="w-28 [&_svg]:h-auto [&_svg]:w-full [&_svg]:text-foreground"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <p className="text-center text-xs text-muted-foreground">
                Scan to look up <span className="font-mono">{product.sku}</span> during a
                stocktake.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
