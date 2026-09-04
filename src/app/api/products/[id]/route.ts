import { ok, withErrors } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/auth";
import { deleteProduct, getProduct, updateProduct } from "@/lib/services/products";
import { productUpdateSchema } from "@/lib/validation/product";

export const GET = withErrors(async (_request, { params }) => {
  await requireUser();
  return ok(await getProduct((await params).id));
});

export const PATCH = withErrors(async (request, { params }) => {
  await requireUser();
  const input = productUpdateSchema.parse(await request.json());
  return ok(await updateProduct((await params).id, input));
});

// Deleting inventory is destructive and irreversible, so it is admin-only.
export const DELETE = withErrors(async (_request, { params }) => {
  await requireAdmin();
  return ok(await deleteProduct((await params).id));
});
