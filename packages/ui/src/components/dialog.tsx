"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { useDeferredUnmountRoot } from "./deferred-unmount";

function Dialog({
  actionsRef,
  onOpenChange,
  onOpenChangeComplete,
  ...props
}: DialogPrimitive.Root.Props) {
  const exitPresence = useDeferredUnmountRoot({
    actionsRef,
    exitDurationMs: 320,
    onOpenChange,
    onOpenChangeComplete,
  });

  return (
    <DialogPrimitive.Root data-slot="dialog" {...props} {...exitPresence} />
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  style,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate z-50 bg-black/80 duration-100 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      data-slot="dialog-overlay"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(2px)",
        ...style,
      }}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  largeWidth = false,
  showCloseButton = true,
  style,
  ...props
}: DialogPrimitive.Popup.Props & {
  largeWidth?: boolean;
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        className={cn(
          "data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-xs/relaxed shadow-[0_22px_80px_rgba(0,0,0,0.18)] outline-none ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in dark:shadow-[0_22px_80px_rgba(0,0,0,0.42)]",
          largeWidth ? "sm:max-w-4xl lg:max-w-5xl" : "sm:max-w-sm",
          className
        )}
        data-slot="dialog-content"
        style={{
          boxShadow:
            "0 0 0 1px rgba(20, 20, 20, 0.08), 0 22px 80px rgba(0, 0, 0, 0.18)",
          ...style,
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                className="absolute top-2 right-2"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      data-slot="dialog-footer"
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("font-medium text-sm", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-muted-foreground text-xs/relaxed *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
