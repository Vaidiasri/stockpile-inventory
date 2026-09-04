"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, patchJson, postJson } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { CategoryRecord } from "@/lib/services/categories";
import { categoryCreateSchema } from "@/lib/validation/category";

type FormValues = { name: string; description: string };

function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category?: CategoryRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(categoryCreateSchema) as never,
    defaultValues: { name: category?.name ?? "", description: category?.description ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = { ...values, description: values.description || null };
    try {
      if (isEdit) await patchJson(`/api/categories/${category!.id}`, payload);
      else await postJson("/api/categories", payload);
      toast.success(isEdit ? "Category updated." : "Category created.");
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories group products and drive the category filter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="contents">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-description">Description</Label>
              <Textarea id="category-description" rows={3} {...register("description")} />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              ) : null}
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
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryManager({
  categories,
  canDelete,
}: {
  categories: CategoryRecord[];
  canDelete: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryRecord>();
  const [deleting, setDeleting] = useState<CategoryRecord>();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <Tags className="size-8 text-muted-foreground" aria-hidden />
          <div className="grid gap-1">
            <p className="font-medium">No categories yet</p>
            <p className="text-sm text-muted-foreground">
              Create one to start grouping your products.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="w-24 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground sm:table-cell">
                    {category.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {category.productCount > 0 ? (
                      <Link
                        href={`/products?category=${category.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {category.productCount}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDate(category.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => setEditing(category)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => setDeleting(category)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating ? <CategoryFormDialog open onOpenChange={setCreating} /> : null}

      {editing ? (
        <CategoryFormDialog
          key={editing.id}
          category={editing}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => !open && setDeleting(undefined)}
          endpoint={`/api/categories/${deleting.id}`}
          title={`Delete ${deleting.name}?`}
          description={
            deleting.productCount > 0
              ? `${deleting.productCount} product(s) still use this category. Reassign them first, or the delete will be refused.`
              : "This category is not used by any product."
          }
          successMessage="Category deleted."
        />
      ) : null}
    </div>
  );
}
