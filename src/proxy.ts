import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Page-level routing only. API authorisation lives in the route handlers
 * (`requireUser`/`requireAdmin`), so a proxy bypass cannot expose data --
 * this file just decides where an anonymous or signed-in visitor lands.
 *
 * Named `proxy` because Next.js 16 renamed the `middleware` convention.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/products", "/categories", "/inventory"];
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes and static assets.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
