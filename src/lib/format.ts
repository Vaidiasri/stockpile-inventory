/** Display formatters. Kept out of lib/utils.ts, which the shadcn CLI owns. */
export const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));

export const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export const formatDateTime = (value: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

export const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
