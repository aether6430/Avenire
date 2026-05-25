"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { useDeferredUnmountRoot } from "./deferred-unmount";

function Sheet({
  actionsRef,
  onOpenChange,
  onOpenChangeComplete,
  ...props
}: SheetPrimitive.Root.Props) {
  const exitPresence = useDeferredUnmountRoot({
    actionsRef,
    exitDurationMs: 340,
    onOpenChange,
    onOpenChangeComplete,
  });

  return <SheetPrimitive.Root data-slot="sheet" {...props} {...exitPresence} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        "data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/80 duration-100 data-closed:animate-out data-open:animate-in data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  const sideClassName =
    side === "left"
      ? "inset-y-0 left-0 h-full w-3/4 border-r data-closed:slide-out-to-left-10 data-open:slide-in-from-left-10 sm:max-w-sm"
      : side === "right"
        ? "inset-y-0 right-0 h-full w-3/4 border-l data-closed:slide-out-to-right-10 data-open:slide-in-from-right-10 sm:max-w-sm"
        : side === "top"
          ? "inset-x-0 top-0 h-auto border-b data-closed:slide-out-to-top-10 data-open:slide-in-from-top-10"
          : "inset-x-0 bottom-0 h-auto border-t data-closed:slide-out-to-bottom-10 data-open:slide-in-from-bottom-10";

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        className={cn(
          "data-closed:fade-out-0 data-open:fade-in-0 fixed z-50 flex flex-col bg-background bg-clip-padding text-xs/relaxed shadow-lg transition duration-200 ease-in-out data-closed:animate-out data-open:animate-in",
          sideClassName,
          className
        )}
        data-side={side}
        data-slot="sheet-content"
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                className="absolute top-4 right-4"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6", className)}
      data-slot="sheet-header"
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 p-6", className)}
      data-slot="sheet-footer"
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      className={cn("font-medium text-foreground text-sm", className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      className={cn("text-muted-foreground text-xs/relaxed", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
