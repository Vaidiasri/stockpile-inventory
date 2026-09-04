import { created, ok, withErrors } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createCategory, listCategories } from "@/lib/services/categories";
import { categoryCreateSchema } from "@/lib/validation/category";

export const GET = withErrors(async () => {
  await requireUser();
  return ok(await listCategories());
});

export const POST = withErrors(async (request) => {
  await requireUser();
  const input = categoryCreateSchema.parse(await request.json());
  return created(await createCategory(input));
});
