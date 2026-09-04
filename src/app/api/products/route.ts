import { created, ok, withErrors } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createProduct, listProducts } from "@/lib/services/products";
import { productCreateSchema, productQuerySchema } from "@/lib/validation/product";

export const GET = withErrors(async (request) => {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const query = productQuerySchema.parse(Object.fromEntries(searchParams));
  const { data, meta } = await listProducts(query);
  return ok(data, 200, meta);
});

export const POST = withErrors(async (request) => {
  const user = await requireUser();
  const input = productCreateSchema.parse(await request.json());
  return created(await createProduct(input, user.id));
});
