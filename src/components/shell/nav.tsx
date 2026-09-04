"use client";

import { Boxes, BookOpen, LayoutDashboard, Package, ScrollText, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/inventory", label: "Stock history", icon: ScrollText },
  { href: "/api-docs", label: "API reference", icon: BookOpen },
] as const;

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="grid gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Brand() {
  return (
    // h-8 matches the 32px line box of a text-2xl page heading, so the brand
    // and the page title share an optical centre.
    <Link
      href="/dashboard"
      className="flex h-8 items-center gap-2 rounded-md px-3 text-base font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Boxes className="size-5 text-primary" aria-hidden />
      Stockpile
    </Link>
  );
}
