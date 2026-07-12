"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 relative rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium focus-visible:ring-2 aria-invalid:ring-2 [&_svg:not([class*='size-'])]:size-4 inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-[var(--ease-out)] active:scale-[0.985] disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border dark:bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-5 gap-1 rounded-sm px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-6 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonIcon = React.ComponentType<{
  "aria-hidden"?: boolean | "true";
  className?: string;
  "data-icon"?: string;
  size?: number | string;
  strokeWidth?: number | string;
}>;

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    active?: boolean;
    leadingIcon?: ButtonIcon;
    loading?: boolean;
    trailingIcon?: ButtonIcon;
  };

function Button({
  active = false,
  children,
  className,
  disabled,
  leadingIcon: LeadingIcon,
  loading = false,
  trailingIcon: TrailingIcon,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const isIconOnly =
    size === "icon" ||
    size === "icon-xs" ||
    size === "icon-sm" ||
    size === "icon-lg";

  const inlineIconClass = cn(
    "shrink-0",
    loading && "opacity-0",
    size === "xs" && "size-2.5",
    size === "sm" && "size-3",
    (size === "default" || size === null || size === undefined) && "size-3.5",
    size === "lg" && "size-4"
  );

  return (
    <ButtonPrimitive
      aria-busy={loading || undefined}
      data-active={active ? "true" : undefined}
      data-slot="button"
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size, className }),
        active && "bg-muted text-foreground"
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="absolute size-3 animate-spin rounded-full border border-current/25 border-t-current"
        />
      ) : null}
      {LeadingIcon && !isIconOnly ? (
        <LeadingIcon
          aria-hidden="true"
          className={inlineIconClass}
          data-icon="inline-start"
        />
      ) : null}
      {loading && children ? (
        <span className="inline-flex items-center justify-center opacity-0">
          {children}
        </span>
      ) : (
        children
      )}
      {TrailingIcon && !isIconOnly ? (
        <TrailingIcon
          aria-hidden="true"
          className={inlineIconClass}
          data-icon="inline-end"
        />
      ) : null}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
