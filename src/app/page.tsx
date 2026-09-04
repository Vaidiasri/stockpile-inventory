import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

export default async function RootPage() {
  redirect((await getSessionUser()) ? "/dashboard" : "/login");
}
