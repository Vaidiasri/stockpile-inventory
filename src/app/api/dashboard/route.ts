import { ok, withErrors } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/dashboard";

export const GET = withErrors(async () => {
  await requireUser();
  return ok(await getDashboardStats());
});
