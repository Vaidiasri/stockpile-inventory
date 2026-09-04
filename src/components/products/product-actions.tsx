"use client";

import { Boxes, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { StockDialog } from "@/components/products/stock-dialog";
import { Button } from "@/components/ui/button";
import type { ProductRecord } from "@/lib/services/products";

/** Action buttons for the product detail page. */
export function ProductActions({
  product,
  categories,
  canDelete,
}: {
  product: ProductRecord;
  categories: { id: string; name: string }[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"stock" | "edit" | "delete">();
  const close = () => setDialog(undefined);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog("stock")}>
          <Boxes aria-hidden />
          Adjust stock
        </Button>
        <Button variant="outline" onClick={() => setDialog("edit")}>
          <Pencil aria-hidden />
          Edit
        </Button>
        {canDelete ? (
          <Button variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 aria-hidden />
            Delete
          </Button>
        ) : null}
      </div>

      {dialog === "stock" ? (
        <StockDialog product={product} open onOpenChange={close} />
      ) : null}

      {dialog === "edit" ? (
        <ProductFormDialog
          categories={categories}
          product={product}
          open
          onOpenChange={close}
        />
      ) : null}

      {dialog === "delete" ? (
        <ConfirmDeleteDialog
          open
          onOpenChange={close}
          endpoint={`/api/products/${product.id}`}
          title={`Delete ${product.name}?`}
          description="The product is removed permanently. Its stock history is kept for the audit trail."
          successMessage="Product deleted."
          // The detail page for a deleted product would 404, so leave first.
          onDeleted={() => router.push("/products")}
        />
      ) : null}
    </>
  );
}
