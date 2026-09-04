"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, postJson } from "@/lib/api-client";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

type AuthFormConfig = {
  title: string;
  description: string;
  endpoint: string;
  // Both auth schemas take and return a flat string map, so the form can stay
  // non-generic. The precise LoginInput/RegisterInput types still guard the
  // route handler and the service, where correctness actually matters.
  schema: ZodType<Record<string, string>, Record<string, string>>;
  submitLabel: string;
  successMessage: string;
  fields: {
    name: string;
    label: string;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
  }[];
  footer: { prompt: string; linkLabel: string; href: string };
};

/**
 * The config lives in this Client Component rather than arriving as props: a
 * Zod schema is a class instance and cannot cross the Server -> Client
 * boundary.
 */
const FORMS: Record<"login" | "register", AuthFormConfig> = {
  login: {
    title: "Sign in",
    description: "Enter your credentials to reach your inventory.",
    endpoint: "/api/auth/login",
    schema: loginSchema,
    submitLabel: "Sign in",
    successMessage: "Welcome back.",
    fields: [
      {
        name: "email",
        label: "Email",
        type: "email",
        autoComplete: "email",
        placeholder: "you@company.com",
      },
      { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
    ],
    footer: { prompt: "No account yet?", linkLabel: "Create one", href: "/register" },
  },
  register: {
    title: "Create an account",
    description: "Start tracking products and stock in a minute.",
    endpoint: "/api/auth/register",
    schema: registerSchema,
    submitLabel: "Create account",
    successMessage: "Account created.",
    fields: [
      { name: "name", label: "Full name", autoComplete: "name", placeholder: "Ada Lovelace" },
      {
        name: "email",
        label: "Email",
        type: "email",
        autoComplete: "email",
        placeholder: "you@company.com",
      },
      {
        name: "password",
        label: "Password",
        type: "password",
        autoComplete: "new-password",
        placeholder: "At least 8 characters",
      },
    ],
    footer: { prompt: "Already registered?", linkLabel: "Sign in", href: "/login" },
  },
};

/**
 * `next` arrives from a query string, so it is attacker-controllable: anything
 * that is not a site-relative path (including protocol-relative "//evil.com")
 * is discarded, or signing in would be an open redirect.
 */
const safeRedirect = (value: string | undefined) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";

export function AuthForm({ mode, next }: { mode: keyof typeof FORMS; next?: string }) {
  const config = FORMS[mode];
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({ resolver: zodResolver(config.schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await postJson(config.endpoint, values);
      toast.success(config.successMessage);
      // Server Components read the session cookie, so the router cache must be
      // dropped before navigating or the shell renders as signed out.
      router.refresh();
      router.replace(safeRedirect(next));
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, message] of Object.entries(error.fields ?? {})) {
          setError(field, { message });
        }
        toast.error(error.message);
        return;
      }
      toast.error("Could not reach the server. Check your connection and try again.");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          {config.fields.map((field) => {
            const message = errors[field.name]?.message;
            return (
              <div key={field.name} className="grid gap-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? `${field.name}-error` : undefined}
                  {...register(field.name)}
                />
                {message ? (
                  <p id={`${field.name}-error`} className="text-sm text-destructive">
                    {message}
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4">
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {isSubmitting ? "Please wait" : config.submitLabel}
          </Button>
          <p className="text-sm text-muted-foreground">
            {config.footer.prompt}{" "}
            <Link
              href={config.footer.href}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {config.footer.linkLabel}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
