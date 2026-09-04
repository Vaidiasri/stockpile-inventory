"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { STATUS_OPTIONS } from "@/components/products/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

const SEARCH_DEBOUNCE_MS = 350;

/**
 * The URL is the filter state -- no client store. That makes a filtered view
 * shareable, survives a refresh, and makes the browser back button undo a
 * filter, all of which a useState-based version gets wrong.
 */
export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in step when navigation changes the URL from outside this
  // component (back button, Clear). Adjusted during render rather than in an
  // effect: an effect would paint the stale value first and then cascade a
  // second render.
  const urlTerm = searchParams.get("q") ?? "";
  const [syncedTerm, setSyncedTerm] = useState(urlTerm);
  if (urlTerm !== syncedTerm) {
    setSyncedTerm(urlTerm);
    setTerm(urlTerm);
  }

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change invalidates the current page number.
    if (!("page" in changes)) next.delete("page");
    startTransition(() => router.replace(`/products?${next}`, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setTerm(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => () => clearTimeout(debounce.current), []);

  const activeFilters = ["q", "category", "status"].filter((key) => searchParams.get(key));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="product-search">Search</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="product-search"
            type="search"
            className="pl-8"
            placeholder="Name or SKU"
            value={term}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="product-category">Category</Label>
        <NativeSelect
          id="product-category"
          value={searchParams.get("category") ?? ""}
          onChange={(event) => apply({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="product-status">Stock status</Label>
        <NativeSelect
          id="product-status"
          value={searchParams.get("status") ?? ""}
          onChange={(event) => apply({ status: event.target.value })}
        >
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex items-center gap-2">
        {activeFilters.length > 0 ? (
          <Button
            variant="ghost"
            onClick={() => startTransition(() => router.replace("/products", { scroll: false }))}
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </Button>
        ) : null}
        {/* Reassures the user that a debounced search is actually working. */}
        <span
          aria-live="polite"
          className={cn(
            "text-xs text-muted-foreground transition-opacity",
            isPending ? "opacity-100" : "opacity-0",
          )}
        >
          {isPending ? "Updating..." : ""}
        </span>
      </div>
    </div>
  );
}
