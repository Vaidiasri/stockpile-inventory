"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Brand, Nav } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu className="size-4" aria-hidden />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 p-4">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="grid gap-6 pt-2">
          <Brand />
          <Nav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
