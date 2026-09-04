import { cn } from "@/lib/utils";

/**
 * A signed stock movement. Extracted because the same
 * "green when positive, red when negative, explicit + sign" treatment was
 * duplicated in the dashboard, the stock history page and the product detail
 * page — three chances for the three to drift apart.
 *
 * The sign carries the meaning on its own, so this reads correctly without
 * colour; the hue only makes it faster to scan.
 */
export function StockDelta({ value, className }: { value: number; className?: string }) {
  const positive = value > 0;
  return (
    <span
      className={cn(
        "tabular-nums",
        positive ? "text-stock-ok" : "text-stock-out",
        className,
      )}
    >
      {positive ? "+" : ""}
      {value}
    </span>
  );
}
