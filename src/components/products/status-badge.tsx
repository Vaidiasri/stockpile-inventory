import type { StockStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STYLES: Record<StockStatus, { label: string; className: string }> = {
  in_stock: {
    label: "In stock",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  low_stock: {
    label: "Low stock",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  out_of_stock: {
    label: "Out of stock",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
};

/** Colour is never the only signal: each state also carries its own words. */
export function StatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const { label, className: tone } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export const STATUS_OPTIONS = (Object.keys(STYLES) as StockStatus[]).map((value) => ({
  value,
  label: STYLES[value].label,
}));
