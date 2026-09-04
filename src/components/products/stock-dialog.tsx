"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { ApiClientError, postJson } from "@/lib/api-client";
import type { ProductRecord } from "@/lib/services/products";

type Mode = "add" | "remove" | "set";

const MODES: { value: Mode; label: string }[] = [
  { value: "add", label: "Add stock" },
  { value: "remove", label: "Remove stock" },
  { value: "set", label: "Set exact count" },
];

/**
 * Three plain choices instead of asking the user to type a signed number.
 * "Add"/"Remove" send a relative delta, which the API applies as
 * `quantity = quantity + delta` so concurrent movements cannot race; "Set"
 * sends an absolute count for a stocktake correction.
 */
export function StockDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed >= 0 && !(mode !== "set" && parsed === 0);
  const projected =
    mode === "set" ? parsed : mode === "add" ? product.quantity + parsed : product.quantity - parsed;

  async function submit() {
    setError(undefined);

    if (!valid) {
      setError("Enter a whole number greater than zero.");
      return;
    }
    // Caught here so the user sees it under the field rather than as a toast
    // after a round trip. The CHECK constraint is still the real guard.
    if (projected < 0) {
      setError(`Only ${product.quantity} in stock, so you cannot remove ${parsed}.`);
      return;
    }

    setSaving(true);
    try {
      const payload =
        mode === "set"
          ? { quantity: parsed, reason: reason || null }
          : { delta: mode === "add" ? parsed : -parsed, reason: reason || null };

      await postJson(`/api/products/${product.id}/stock`, payload);
      toast.success(`Stock updated to ${projected}.`);
      onOpenChange(false);
      setAmount("1");
      setReason("");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof ApiClientError
          ? submitError.message
          : "Could not reach the server. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} &middot; {product.sku} &middot; currently {product.quantity} in stock
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="stock-mode">Action</Label>
            <NativeSelect
              id="stock-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
            >
              {MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="stock-amount">{mode === "set" ? "New count" : "Quantity"}</Label>
            <Input
              id="stock-amount"
              type="number"
              min={mode === "set" ? 0 : 1}
              step="1"
              value={amount}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "stock-error" : "stock-projection"}
              onChange={(event) => setAmount(event.target.value)}
            />
            {error ? (
              <p id="stock-error" className="text-sm text-destructive">
                {error}
              </p>
            ) : (
              <p id="stock-projection" className="text-xs text-muted-foreground">
                {valid
                  ? `New quantity will be ${projected}.`
                  : "Enter a whole number greater than zero."}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="stock-reason">Reason (optional)</Label>
            <Input
              id="stock-reason"
              placeholder="Received shipment, damaged, stocktake..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
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
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Update stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
