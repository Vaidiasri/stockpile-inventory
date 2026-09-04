import { put } from "@vercel/blob";

import { ok, withErrors } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { AppError, badRequest } from "@/lib/errors";
import { env } from "@/lib/env";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"];

export const POST = withErrors(async (request) => {
  await requireUser();

  // Optional feature: without a store configured, say so plainly instead of
  // failing with a driver error. The form falls back to pasting a URL.
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new AppError(
      501,
      "Image upload is not configured. Set BLOB_READ_WRITE_TOKEN, or paste an image URL instead.",
      "NOT_CONFIGURED",
    );
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) throw badRequest("Attach a file to upload.");
  if (!ALLOWED.includes(file.type)) {
    throw badRequest("Upload a PNG, JPEG, WebP, AVIF or GIF image.");
  }
  if (file.size > MAX_BYTES) throw badRequest("Images must be 4MB or smaller.");

  const blob = await put(`products/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  return ok({ url: blob.url });
});
