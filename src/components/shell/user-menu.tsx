"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { postJson } from "@/lib/api-client";
import type { SessionUser } from "@/lib/session";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

export function UserMenu({
  user,
  /** The sidebar footer has room for the name; the mobile bar does not. */
  showName = false,
}: {
  user: SessionUser;
  showName?: boolean;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await postJson("/api/auth/logout", {});
      router.refresh();
      router.replace("/login");
    } catch {
      toast.error("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          showName ? (
            <Button
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start gap-2 px-3 py-1.5"
              aria-label="Account menu"
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 text-left">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground capitalize">
                  {user.role}
                </span>
              </span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              aria-label="Account menu"
            >
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {/* Base UI requires a group around a menu label. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            <span className="mt-1 text-xs font-normal text-muted-foreground capitalize">
              Role: {user.role}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={signingOut}>
          <LogOut className="size-4" aria-hidden />
          {signingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
