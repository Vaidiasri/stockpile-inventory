import { z } from "zod";

const nameField = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(100, "Name must be 100 characters or fewer.");

const descriptionField = z
  .string()
  .trim()
  .max(500, "Description must be 500 characters or fewer.")
  .transform((value) => value || null)
  .nullish();

export const categoryCreateSchema = z.object({
  name: nameField,
  description: descriptionField,
});

export const categoryUpdateSchema = categoryCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field to update." },
);

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
