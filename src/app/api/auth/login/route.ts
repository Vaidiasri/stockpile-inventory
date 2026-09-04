import { attachSession } from "@/lib/auth";
import { ok, withErrors } from "@/lib/api";
import { authenticateUser } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validation/auth";

export const POST = withErrors(async (request) => {
  const input = loginSchema.parse(await request.json());
  const user = await authenticateUser(input);
  return attachSession(ok(user), user);
});
