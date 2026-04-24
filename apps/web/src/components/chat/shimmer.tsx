"use client";

import type { CSSProperties, ElementType, JSX } from "react";

import { motion } from "motion/react";
import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

function createShimmerStyle(spread: number): CSSProperties {
  return {
    "--spread": `${spread}px`,
    backgroundImage:
      "linear-gradient(90deg, transparent calc(50% - var(--spread)), hsl(var(--background)) 50%, transparent calc(50% + var(--spread)))",
    backgroundPosition: "100% center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "250% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
  } as CSSProperties;
}

const ShimmerComponent = ({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = useMemo(() => {
    return Component === "span"
      ? motion.span
      : motion.create(Component as keyof JSX.IntrinsicElements);
  }, [Component]);

  const dynamicSpread = useMemo(
    () => Math.max(8, (children?.length ?? 0) * spread),
    [children, spread]
  );

  return (
    <span className={cn("relative inline-block align-baseline", className)}>
      <span aria-hidden="true" className="text-foreground/60">
        {children}
      </span>
      <MotionComponent
        aria-hidden="true"
        animate={{ backgroundPosition: "0% center" }}
        className="absolute inset-0 text-transparent"
        initial={{ backgroundPosition: "100% center" }}
        style={createShimmerStyle(dynamicSpread)}
        transition={{
          duration,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {children}
      </MotionComponent>
    </span>
  );
};

export const Shimmer = memo(ShimmerComponent);
