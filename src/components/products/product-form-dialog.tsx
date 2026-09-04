"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch, patchJson, postJson } from "@/lib/api-client";
import type { ProductRecord } from "@/lib/services/products";
import { productCreateSchema } from "@/lib/validation/product";

type Category = { id: string; name: string };

/**
 * The same schema the route handler parses, so a rule can never be enforced on
 * one side only. Create validates everything; edit reuses it because the edit
 * form shows the same fields (minus quantity, which only the stock dialog can
 * change so that every movement leaves an audit row).
 */
type FormValues = {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  supplierName: string;
  lowStockThreshold: string;
  imageUrl: string;
};

const toDefaults = (product?: ProductRecord): FormValues => ({
  name: product?.name ?? "",
  sku: product?.sku ?? "",
  categoryId: product?.categoryId ?? "",
  description: product?.description ?? "",
  quantity: String(product?.quantity ?? 0),
  unitPrice: product?.unitPrice ?? "0.00",
  supplierName: product?.supplierName ?? "",
  lowStockThreshold: String(product?.lowStockThreshold ?? 10),
  imageUrl: product?.imageUrl ?? "",
});

/**
 * Declared at module level, not inside ProductFormDialog. A component defined
 * during render is a new type on every render, so React would unmount and
 * remount its children -- and the input would lose focus on every keystroke.
 */
function Field({
  name,
  label,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ProductFormDialog({
  categories,
  product,
  open,
  onOpenChange,
}: {
  categories: Category[];
  product?: ProductRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(productCreateSchema) as never,
    defaultValues: toDefaults(product),
  });

  // useWatch, not watch(): watch() returns a new function each render, which
  // the React Compiler cannot memoize.
  const imageUrl = useWatch({ control, name: "imageUrl" });

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const { url } = await apiFetch<{ url: string }>("/api/uploads", { method: "POST", body });
      setValue("imageUrl", url, { shouldValidate: true });
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not upload that image.",
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    // Empty optional fields post as "", which the API reads as "unset".
    const payload = {
      ...values,
      categoryId: values.categoryId || null,
      description: values.description || null,
      supplierName: values.supplierName || null,
      imageUrl: values.imageUrl || null,
    };

    try {
      if (isEdit) {
        const { quantity, ...editable } = payload;
        void quantity;
        await patchJson(`/api/products/${product!.id}`, editable);
        toast.success("Product updated.");
      } else {
        await postJson("/api/products", payload);
        toast.success("Product created.");
      }
      onOpenChange(false);
      reset(toDefaults());
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, message] of Object.entries(error.fields ?? {})) {
          setError(field as keyof FormValues, { message });
        }
        toast.error(error.message);
        return;
      }
      toast.error("Could not reach the server. Please try again.");
    }
  });

  const fieldError = (name: keyof FormValues) => errors[name]?.message as string | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        The body scrolls, not the whole dialog: a dialog that scrolls as one
        block pushes its own footer out of reach on a 768px-tall screen.
      */}
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Stock quantity is changed from the stock dialog so every movement is recorded."
              : "Opening stock is recorded as the product's first stock movement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="contents">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-1 py-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field name="name" label="Product name" error={fieldError("name")}>
                <Input
                  id="name"
                  aria-invalid={Boolean(fieldError("name"))}
                  {...register("name")}
                />
              </Field>
            </div>

            <Field name="sku" label="SKU" error={fieldError("sku")} hint="Unique. Saved in upper case.">
              <Input
                id="sku"
                placeholder="ELEC-KB-001"
                aria-invalid={Boolean(fieldError("sku"))}
                {...register("sku")}
              />
            </Field>

            <Field name="categoryId" label="Category" error={fieldError("categoryId")}>
              <NativeSelect id="categoryId" {...register("categoryId")}>
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field name="unitPrice" label="Unit price" error={fieldError("unitPrice")}>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                aria-invalid={Boolean(fieldError("unitPrice"))}
                {...register("unitPrice")}
              />
            </Field>

            {/* Quantity only on create: afterwards it moves only via the
                stock dialog, so every change leaves an audit row. */}
            {isEdit ? null : (
              <Field name="quantity" label="Opening stock" error={fieldError("quantity")}>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  aria-invalid={Boolean(fieldError("quantity"))}
                  {...register("quantity")}
                />
              </Field>
            )}

            <Field
              name="lowStockThreshold"
              label="Low stock threshold"
              error={fieldError("lowStockThreshold")}
              hint="Sets when the status flips to Low stock."
            >
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                aria-invalid={Boolean(fieldError("lowStockThreshold"))}
                {...register("lowStockThreshold")}
              />
            </Field>

            <Field name="supplierName" label="Supplier" error={fieldError("supplierName")}>
              <Input id="supplierName" {...register("supplierName")} />
            </Field>

            <div className="sm:col-span-2">
              <Field name="imageUrl" label="Image" error={fieldError("imageUrl")} hint="Paste a URL, or upload a file.">
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    placeholder="https://..."
                    aria-invalid={Boolean(fieldError("imageUrl"))}
                    {...register("imageUrl")}
                  />
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => onFilePicked(event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Upload aria-hidden />
                    )}
                    {uploading ? "Uploading" : "Upload"}
                  </Button>
                </div>
              </Field>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="mt-2 h-20 w-20 rounded-md border object-cover"
                />
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <Field name="description" label="Description" error={fieldError("description")}>
                <Textarea id="description" rows={3} {...register("description")} />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
