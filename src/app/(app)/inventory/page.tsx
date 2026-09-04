import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StockDelta } from "@/components/stock-delta";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { listTransactions, transactionQuerySchema } from "@/lib/services/inventory";

export const metadata: Metadata = { title: "Stock history - Stockpile" };

const LABELS = { in: "Stock in", out: "Stock out", adjust: "Correction" } as const;

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const raw = await searchParams;
  const query = transactionQuerySchema.parse(raw);
  const { data: movements, meta } = await listTransactions(query);

  const params = Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Stock history</h1>
          <p className="text-sm text-muted-foreground">
            Every movement, including for products since deleted.
          </p>
        </div>
        {/* A plain GET form: filtering needs no client JavaScript. */}
        <form className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="type">Movement type</Label>
            <NativeSelect id="type" name="type" defaultValue={params.type ?? ""}>
              <option value="">All movements</option>
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
              <option value="adjust">Corrections</option>
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <ScrollText className="size-8 text-muted-foreground" aria-hidden />
          <div className="grid gap-1">
            <p className="font-medium">No stock movements</p>
            <p className="text-sm text-muted-foreground">
              Adjust the stock on any product and it will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="hidden lg:table-cell">Reason</TableHead>
                <TableHead className="hidden sm:table-cell">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id} className="transition-colors hover:bg-accent">
                  <TableCell className="text-xs text-muted-foreground">
                    {/* TableCell is nowrap, so the full timestamp would push
                        Change and Balance off a phone screen. */}
                    <span className="sm:hidden">{formatDate(movement.createdAt)}</span>
                    <span className="hidden sm:inline">
                      {formatDateTime(movement.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {movement.productId ? (
                      <Link
                        href={`/products/${movement.productId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {movement.productName}
                      </Link>
                    ) : (
                      <span className="font-medium text-muted-foreground">
                        {movement.productName} (deleted)
                      </span>
                    )}
                    <span className="block font-mono text-xs text-muted-foreground">
                      {movement.productSku}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{LABELS[movement.type]}</TableCell>
                  <TableCell className="text-right">
                    <StockDelta value={movement.quantityDelta} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {movement.quantityAfter}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {movement.reason ?? "-"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {movement.userName ?? "Deleted user"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination meta={meta} params={params} basePath="/inventory" />
    </div>
  );
}
