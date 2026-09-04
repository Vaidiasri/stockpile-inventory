import type { ApiError } from "./api";

/** Thrown by `apiFetch` for any non-2xx response, carrying field-level messages. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as ApiError | null)?.error;
    throw new ApiClientError(
      error?.message ?? "Something went wrong. Please try again.",
      response.status,
      error?.code ?? "UNKNOWN",
      error?.fields,
    );
  }

  return body;
}

/** Unwraps the `{ data }` envelope used by every endpoint. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const body = (await request(path, init)) as { data: T } | null;
  return body?.data as T;
}

/** For list endpoints, which return `{ data, meta }`. */
export async function apiFetchList<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  return (await request(path, init)) as {
    data: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
}

export const postJson = <T>(path: string, payload: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(payload) });

export const patchJson = <T>(path: string, payload: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(payload) });

export const del = <T>(path: string) => apiFetch<T>(path, { method: "DELETE" });
