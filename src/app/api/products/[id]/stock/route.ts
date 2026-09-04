import { ok, withErrors } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { adjustStock } from "@/lib/services/products";
import { stockAdjustSchema } from "@/lib/validation/product";

export const POST = withErrors(async (request, { params }) => {
  const user = await requireUser();
  const input = stockAdjustSchema.parse(await request.json());
  return ok(await adjustStock((await params).id, input, user.id));
});
