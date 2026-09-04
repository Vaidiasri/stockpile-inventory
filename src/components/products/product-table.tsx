"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { StatusBadge } from "@/components/products/status-badge";
import { StockDialog } from "@/components/products/stock-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { ProductRecord } from "@/lib/services/products";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

type Column = {
  key: string;
  label: string;
  sortable: boolean;
  className?: string;
  /** Right-aligns the header link too, so it sits over its own numbers. */
  numeric?: boolean;
};

// Columns drop by priority as the viewport narrows: the identifier and the
// two numbers a controller is actually scanning survive longest.
const COLUMNS: Column[] = [
  { key: "name", label: "Product", sortable: true },
  { key: "sku", label: "SKU", sortable: true, className: "hidden md:table-cell" },
  { key: "category", label: "Category", sortable: false, className: "hidden lg:table-cell" },
  { key: "quantity", label: "Stock", sortable: true, className: "text-right", numeric: true },
  {
    key: "unitPrice",
    label: "Unit price",
    sortable: true,
    className: "hidden text-right sm:table-cell",
    numeric: true,
  },
  { key: "status", label: "Status", sortable: false },
  { key: "updatedAt", label: "Updated", sortable: false, className: "hidden xl:table-cell" },
];

/**
 * Sorting is a link, not a click handler: the sort lives in the URL, so it is
 * shareable, survives a refresh, and works with the back button. Server
 * Components re-render with the new order.
 */
function SortableHeader({
  column,
  label,
  currentSort,
  currentOrder,
  params,
}: {
  column: string;
  label: string;
  currentSort: string;
  currentOrder: string;
  params: Record<string, string>;
}) {
  const active = currentSort === column;
  // Clicking the active column flips direction; a new column starts ascending.
  const nextOrder = active && currentOrder === "asc" ? "desc" : "asc";
  const next = new URLSearchParams({ ...params, sort: column, order: nextOrder });
  next.delete("page");

  const Icon = !active ? ArrowUpDown : currentOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link
      href={`/products?${next}`}
      scroll={false}
      aria-label={`Sort by ${label}, ${nextOrder}ending`}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group/sort -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <Icon
        className={cn(
          "size-3 transition-opacity",
          // Only the sorted column shows a direction; the rest reveal the
          // affordance on hover or focus instead of shouting permanently.
          active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60",
        )}
        aria-hidden
      />
    </Link>
  );
}

export function ProductTable({
  products,
  categories,
  canDelete,
  params,
}: {
  products: ProductRecord[];
  categories: Category[];
  canDelete: boolean;
  params: Record<string, string>;
}) {
  const [editing, setEditing] = useState<ProductRecord>();
  const [adjusting, setAdjusting] = useState<ProductRecord>();
  const [deleting, setDeleting] = useState<ProductRecord>();

  const currentSort = params.sort ?? "createdAt";
  const currentOrder = params.order ?? "desc";

  if (products.length === 0) {
    const filtered = Boolean(params.q || params.category || params.status);
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
        <div className="grid gap-1">
          <p className="font-medium">{filtered ? "No matching products" : "No products yet"}</p>
          <p className="text-sm text-muted-foreground">
            {filtered
              ? "Try a different search term, or clear the filters."
              : "Add your first product to start tracking stock."}
          </p>
        </div>
        {filtered ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/products">Clear filters</Link>}
          />
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* Wide tables scroll in their own container so the page never does. */}
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  <span className={cn("flex", column.numeric && "justify-end")}>
                    {column.sortable ? (
                      <SortableHeader
                        column={column.key}
                        label={column.label}
                        currentSort={currentSort}
                        currentOrder={currentOrder}
                        params={params}
                      />
                    ) : (
                      column.label
                    )}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="transition-colors hover:bg-accent">
                <TableCell className="font-medium">
                  <Link
                    href={`/products/${product.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground md:hidden">
                    {product.sku}
                  </span>
                </TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">
                  {product.sku}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {product.categoryName ?? (
                    <span className="text-muted-foreground">Uncategorised</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {product.quantity}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {formatCurrency(product.unitPrice)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={product.status} />
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                  <time
                    dateTime={new Date(product.updatedAt).toISOString()}
                    title={formatDateTime(product.updatedAt)}
                  >
                    {formatDate(product.updatedAt)}
                  </time>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="touch-target"
                          aria-label={`Actions for ${product.name}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`/products/${product.id}`} />}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAdjusting(product)}>
                        Adjust stock
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(product)}>Edit</DropdownMenuItem>
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleting(product)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Keyed so switching rows resets the form to the new product's values. */}
      {editing ? (
        <ProductFormDialog
          key={editing.id}
          categories={categories}
          product={editing}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      ) : null}

      {adjusting ? (
        <StockDialog
          key={adjusting.id}
          product={adjusting}
          open
          onOpenChange={(open) => !open && setAdjusting(undefined)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => !open && setDeleting(undefined)}
          endpoint={`/api/products/${deleting.id}`}
          title={`Delete ${deleting.name}?`}
          description="The product is removed permanently. Its stock history is kept for the audit trail."
          successMessage="Product deleted."
        />
      ) : null}
    </>
  );
}
