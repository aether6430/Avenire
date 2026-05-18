import type React from "react";
import { cn } from "@/lib/utils";

export const Button = <T extends React.ElementType = "button">({
  children,
  variant = "primary",
  className,
  as,
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "brand";
  className?: string;
  as?: T;
} & Omit<
  React.ComponentPropsWithoutRef<T>,
  "children" | "className" | "as"
>) => {
  const Component = as || "button";

  return (
    <Component
      {...props}
      className={cn(
        "block rounded-2xl px-6 py-2 text-center font-medium text-sm transition duration-150 active:scale-[0.98] sm:text-base",
        variant === "primary"
          ? "bg-brand text-[#1b2733] shadow-[0_0_32px_-18px_var(--color-brand)] hover:bg-brand/90"
          : variant === "brand"
            ? "bg-brand text-[#1b2733]"
            : "border border-divide bg-white/5 text-white transition duration-200 hover:border-brand/60 hover:bg-brand/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800",
        className
      )}
    >
      {children}
    </Component>
  );
};
