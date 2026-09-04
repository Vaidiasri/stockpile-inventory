import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/lib/api";

/**
 * Links rather than buttons, so pages are bookmarkable and the back button
 * works. A Server Component: paging needs no client JavaScript at all.
 */
export function Pagination({
  meta,
  params,
  basePath,
}: {
  meta: PageMeta;
  params: Record<string, string>;
  basePath: string;
}) {
  const href = (page: number) => `${basePath}?${new URLSearchParams({ ...params, page: String(page) })}`;

  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {meta.total === 0
          ? "No results"
          : `Showing ${first}-${last} of ${meta.total}`}
      </p>

      {meta.totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {meta.page > 1 ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={href(meta.page - 1)} scroll={false} rel="prev">
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Previous
                </Link>
              }
            />
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="size-3.5" aria-hidden />
              Previous
            </Button>
          )}

          <span className="px-1 text-sm text-muted-foreground tabular-nums">
            Page {meta.page} of {meta.totalPages}
          </span>

          {meta.page < meta.totalPages ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={href(meta.page + 1)} scroll={false} rel="next">
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              }
            />
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
