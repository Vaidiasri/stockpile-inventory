"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { Button } from "@/components/ui/button";

/** Just the trigger: the page around it stays a Server Component. */
export function AddProductButton({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Add product
      </Button>
      {open ? <ProductFormDialog categories={categories} open onOpenChange={setOpen} /> : null}
    </>
  );
}
