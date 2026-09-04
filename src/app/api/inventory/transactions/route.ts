import { ok, withErrors } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listTransactions, transactionQuerySchema } from "@/lib/services/inventory";

export const GET = withErrors(async (request) => {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const query = transactionQuerySchema.parse(Object.fromEntries(searchParams));
  const { data, meta } = await listTransactions(query);
  return ok(data, 200, meta);
});
