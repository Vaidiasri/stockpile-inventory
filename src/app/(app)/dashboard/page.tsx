import type { Metadata } from "next";

import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard - Stockpile" };

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Signed in as {user?.name} ({user?.role}). Inventory metrics land here in the next step.
      </p>
    </div>
  );
}
