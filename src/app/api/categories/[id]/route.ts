import { ok, withErrors } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/auth";
import { deleteCategory, getCategory, updateCategory } from "@/lib/services/categories";
import { categoryUpdateSchema } from "@/lib/validation/category";

export const GET = withErrors(async (_request, { params }) => {
  await requireUser();
  return ok(await getCategory((await params).id));
});

export const PATCH = withErrors(async (request, { params }) => {
  await requireUser();
  const input = categoryUpdateSchema.parse(await request.json());
  return ok(await updateCategory((await params).id, input));
});

export const DELETE = withErrors(async (_request, { params }) => {
  await requireAdmin();
  return ok(await deleteCategory((await params).id));
});
