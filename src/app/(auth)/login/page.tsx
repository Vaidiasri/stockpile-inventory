import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in - Stockpile" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Read on the server and passed down, so the form needs no useSearchParams
  // and the page does not bail out of static rendering.
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />;
}
