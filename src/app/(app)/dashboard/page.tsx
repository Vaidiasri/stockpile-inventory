import { AlertTriangle, ArrowRight, PackageX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/products/status-badge";
import { StockDelta } from "@/components/stock-delta";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import {
  getAttentionList,
  getDashboardStats,
  getRecentMovements,
  getStockByCategory,
} from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard - Stockpile" };

const MOVEMENT_LABELS = { in: "Stock in", out: "Stock out", adjust: "Correction" } as const;

const ATTENTION_LIMIT = 5;

export default async function DashboardPage() {
  const [stats, attention, byCategory, movements] = await Promise.all([
    getDashboardStats(),
    getAttentionList(ATTENTION_LIMIT + 1),
    getStockByCategory(),
    getRecentMovements(5),
  ]);

  const needsAttention = stats.lowStockItems + stats.outOfStockItems;
  const shown = attention.slice(0, ATTENTION_LIMIT);
  const remaining = needsAttention - shown.length;

  /**
   * Two tiers, not six identical cards. Low and out of stock are the only
   * figures a stock controller can act on at 7am, so they get the size, the
   * colour and a destination. Everything else is reference and reads as a
   * strip.
   */
  const actions = [
    {
      label: "Low stock",
      value: stats.lowStockItems,
      href: "/products?status=low_stock&sort=quantity&order=asc",
      icon: AlertTriangle,
      tone: "text-stock-low",
      surface: "bg-stock-low-surface",
      idle: "At or under the reorder threshold",
      active: "Reorder before they run out",
    },
    {
      label: "Out of stock",
      value: stats.outOfStockItems,
      href: "/products?status=out_of_stock&sort=name&order=asc",
      icon: PackageX,
      tone: "text-stock-out",
      surface: "bg-stock-out-surface",
      idle: "Nothing has run out",
      active: "Cannot be dispatched",
    },
  ];

  const reference = [
    { label: "Products", value: formatNumber(stats.totalProducts) },
    { label: "Categories", value: formatNumber(stats.totalCategories) },
    { label: "Units on hand", value: formatNumber(stats.totalStock) },
    { label: "Stock value", value: formatCurrency(stats.inventoryValue) },
  ];

  const busiest = Math.max(1, ...byCategory.map((row) => row.quantity));

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        {/* Carries a fact, rather than greeting the user. */}
        <p className="text-sm text-muted-foreground">
          {needsAttention === 0
            ? `All ${formatNumber(stats.totalProducts)} products are above their reorder threshold.`
            : `${formatNumber(needsAttention)} of ${formatNumber(stats.totalProducts)} products need attention.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(({ label, value, href, icon: Icon, tone, surface, idle, active }) => {
          const quiet = value === 0;
          return (
            <Link
              key={label}
              href={href}
              aria-label={`${value} products ${label.toLowerCase()}`}
              className="group grid gap-3 rounded-xl border p-4 transition-colors hover:border-ring/60 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-md ${
                    quiet ? "bg-muted text-muted-foreground" : `${surface} ${tone}`
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className="text-sm font-medium">{label}</span>
                <ArrowRight
                  className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className={`text-metric ${quiet ? "text-muted-foreground" : tone}`}>
                  {formatNumber(value)}
                </span>
                <span className="text-xs text-muted-foreground">{quiet ? idle : active}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Reference figures. A hairline strip, not cards: nothing here is
          actionable, so nothing here should look clickable. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {reference.map(({ label, value }) => (
          <div key={label} className="grid gap-0.5 bg-background p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            {shown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Everything is above its reorder threshold.
              </p>
            ) : (
              <>
                <ul className="grid gap-0.5">
                  {shown.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {product.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {product.sku}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2.5">
                          <span className="text-sm tabular-nums">
                            <span className="font-medium">{product.quantity}</span>
                            <span className="text-muted-foreground">
                              /{product.lowStockThreshold}
                            </span>
                          </span>
                          <StatusBadge status={product.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {remaining > 0 ? (
                  <Link
                    href="/products?status=low_stock&sort=quantity&order=asc"
                    className="mt-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {remaining} more {remaining === 1 ? "product" : "products"}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock by category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No products yet.</p>
            ) : (
              /* CSS bars, not a charting library: proportional, themeable, and
                 the figures beside them carry the same information as text. */
              <ul className="grid gap-3.5">
                {byCategory.map((row) => (
                  <li key={row.category} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{row.category}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatNumber(row.quantity)} units &middot; {row.products}{" "}
                        {row.products === 1 ? "product" : "products"}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(2, (row.quantity / busiest) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent movements</CardTitle>
          <CardAction>
            <Link
              href="/inventory"
              className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Full history
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <ul className="grid gap-3">
              {movements.map((movement) => (
                <li key={movement.id} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate font-medium">{movement.productName}</span>
                      {/* Sits beside the name it identifies, not stranded at
                          the far edge of the row. */}
                      <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
                        {movement.productSku}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {MOVEMENT_LABELS[movement.type]} &middot;{" "}
                      {formatDateTime(movement.createdAt)}
                    </span>
                  </span>
                  {/* Fixed width so the signs line up in a column. */}
                  <StockDelta value={movement.quantityDelta} className="w-12 shrink-0 text-right" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
