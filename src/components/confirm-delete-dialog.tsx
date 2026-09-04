"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiClientError, del } from "@/lib/api-client";

/**
 * Shared by products and categories: both deletes differ only in the endpoint
 * and the wording. A 409 (a category that still has products) is shown as a
 * toast with the server's own explanation rather than a generic failure.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  endpoint,
  title,
  description,
  successMessage,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  title: string;
  description: string;
  successMessage: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await del(endpoint);
      toast.success(successMessage);
      onOpenChange(false);
      onDeleted?.();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Could not reach the server. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="ghost">Cancel</Button>} />
          <AlertDialogAction
            render={
              <Button variant="destructive" onClick={confirm} disabled={deleting}>
                {deleting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Delete
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
