"use client";

import type * as React from "react";
import type {
  ContentProps as VaulContentProps,
  DialogProps as VaulDialogProps,
} from "vaul";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "../lib/utils";

function Drawer({ ...props }: VaulDialogProps) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      data-slot="drawer-overlay"
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: VaulContentProps) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-transparent p-2 outline-none",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:max-h-[min(82vh,46rem)] data-[vaul-drawer-direction=bottom]:pt-6",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:max-h-[min(82vh,46rem)] data-[vaul-drawer-direction=top]:pb-6",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-[min(22rem,85vw)] data-[vaul-drawer-direction=left]:pr-6",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-[min(22rem,85vw)] data-[vaul-drawer-direction=right]:pl-6",
          "data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className
        )}
        data-slot="drawer-content"
        {...props}
      >
        <div className="mx-auto mb-2 hidden h-1.5 w-12 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        <div
          className="overflow-hidden rounded-t-[28px] border border-border/70 bg-background/96 shadow-2xl shadow-black/10 backdrop-blur-xl data-[vaul-drawer-direction=left]:rounded-r-[28px] data-[vaul-drawer-direction=top]:rounded-b-[28px] data-[vaul-drawer-direction=right]:rounded-l-[28px]"
          data-slot="drawer-surface"
        >
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 pt-4 pb-3 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center",
        className
      )}
      data-slot="drawer-header"
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 px-4 pt-3 pb-4", className)}
      data-slot="drawer-footer"
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn(
        "font-medium text-foreground text-sm tracking-tight",
        className
      )}
      data-slot="drawer-title"
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-muted-foreground text-xs/relaxed", className)}
      data-slot="drawer-description"
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
