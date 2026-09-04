import { AlertTriangle, Boxes, IndianRupee, Package, PackageX, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/products/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import {
  getAttentionList,
  getDashboardStats,
  getRecentMovements,
  getStockByCategory,
} from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard - Stockpile" };

const MOVEMENT_LABELS = { in: "Stock in", out: "Stock out", adjust: "Correction" } as const;

export default async function DashboardPage() {
  const [stats, attention, byCategory, movements, user] = await Promise.all([
    getDashboardStats(),
    getAttentionList(),
    getStockByCategory(),
    getRecentMovements(),
    getSessionUser(),
  ]);

  const cards = [
    { label: "Total products", value: formatNumber(stats.totalProducts), icon: Package },
    { label: "Categories", value: formatNumber(stats.totalCategories), icon: Tags },
    { label: "Units in stock", value: formatNumber(stats.totalStock), icon: Boxes },
    {
      label: "Low stock",
      value: formatNumber(stats.lowStockItems),
      icon: AlertTriangle,
      href: "/products?status=low_stock",
      tone: stats.lowStockItems > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
    },
    {
      label: "Out of stock",
      value: formatNumber(stats.outOfStockItems),
      icon: PackageX,
      href: "/products?status=out_of_stock",
      tone: stats.outOfStockItems > 0 ? "text-red-600 dark:text-red-400" : undefined,
    },
    { label: "Inventory value", value: formatCurrency(stats.inventoryValue), icon: IndianRupee },
  ];

  const busiest = Math.max(1, ...byCategory.map((row) => row.quantity));

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.name.split(" ")[0]}. Here is where your inventory stands.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href, tone }) => {
          const body = (
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
              </div>
              <span className={`truncate text-2xl font-semibold tabular-nums ${tone ?? ""}`}>
                {value}
              </span>
            </div>
          );

          return href ? (
            <Link
              key={label}
              href={href}
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              {body}
            </Link>
          ) : (
            <div key={label} className="rounded-xl border p-4">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Everything is above its low-stock threshold.
              </p>
            ) : (
              <ul className="grid gap-3">
                {attention.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {product.sku}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums">
                        {product.quantity}
                        <span className="text-muted-foreground">
                          /{product.lowStockThreshold}
                        </span>
                      </span>
                      <StatusBadge status={product.status} />
                    </div>
                  </li>
                ))}
              </ul>
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
              /* CSS bars rather than a charting library: proportional, themeable
                 and readable by a screen reader through the text beside them. */
              <ul className="grid gap-3">
                {byCategory.map((row) => (
                  <li key={row.category} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{row.category}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
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
          <CardTitle>Recent stock movements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <ul className="grid gap-3">
              {movements.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{movement.productName}</span>
                    <span className="text-xs text-muted-foreground">
                      {MOVEMENT_LABELS[movement.type]} &middot;{" "}
                      {formatDateTime(movement.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 tabular-nums ${
                      movement.quantityDelta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {movement.quantityDelta > 0 ? "+" : ""}
                    {movement.quantityDelta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
