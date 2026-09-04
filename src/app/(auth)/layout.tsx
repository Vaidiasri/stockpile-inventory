import { Boxes } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4 sm:p-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <Boxes className="size-6 text-primary" aria-hidden />
        Stockpile
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="text-xs text-muted-foreground">Inventory management, minus the spreadsheet.</p>
    </div>
  );
}
