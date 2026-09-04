import { requireUser } from "@/lib/auth";
import { ok, withErrors } from "@/lib/api";

export const GET = withErrors(async () => ok(await requireUser()));
