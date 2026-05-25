import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden text-balance rounded-[1.5rem] border border-border/60 border-dashed px-6 py-8 text-center ring-1 ring-border/20 ring-inset",
        className
      )}
      data-slot="empty"
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 flex max-w-sm flex-col items-center gap-1",
        className
      )}
      data-slot="empty-header"
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      className={cn(emptyMediaVariants({ variant, className }))}
      data-slot="empty-icon"
      data-variant={variant}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "font-medium text-foreground text-sm tracking-tight",
        className
      )}
      data-slot="empty-title"
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      className={cn(
        "text-muted-foreground/90 text-xs/relaxed [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      data-slot="empty-description"
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 flex w-full min-w-0 max-w-sm flex-col items-center gap-2 text-balance text-xs/relaxed",
        className
      )}
      data-slot="empty-content"
      {...props}
    />
  );
}

function EmptyActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center justify-center gap-2",
        className
      )}
      data-slot="empty-actions"
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  EmptyActions,
};
