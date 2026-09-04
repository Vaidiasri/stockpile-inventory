import { clearSession } from "@/lib/auth";
import { ok, withErrors } from "@/lib/api";

export const POST = withErrors(async () => clearSession(ok({ signedOut: true })));
