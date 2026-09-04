import { redirect } from "next/navigation";

import { MobileNav } from "@/components/shell/mobile-nav";
import { Brand, Nav } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { getSessionUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects anonymous visitors; repeated here so the shell
  // can rely on a non-null user and never renders without one.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-muted/30 py-4 lg:flex lg:flex-col lg:gap-6">
        <Brand />
        <div className="px-2">
          <Nav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-6">
          <MobileNav />
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
