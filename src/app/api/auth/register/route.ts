import { attachSession } from "@/lib/auth";
import { created, withErrors } from "@/lib/api";
import { registerUser } from "@/lib/services/auth";
import { registerSchema } from "@/lib/validation/auth";

export const POST = withErrors(async (request) => {
  const input = registerSchema.parse(await request.json());
  const user = await registerUser(input);
  return attachSession(created(user), user);
});
