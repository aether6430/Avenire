import type React from "react";
import { cn } from "@/lib/utils";

export interface TextShimmerProps {
  as?: React.ElementType;
  children: string;
  className?: string;
  duration?: number;
  spread?: number;
}

function TextShimmerCore({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  const dynamicSpread = children.length * spread;

  return (
    <Component
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text",
        "text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        "dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        className
      )}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--base-color), var(--base-color))",
          animation: `avenire-text-shimmer ${duration * 2}s linear infinite`,
          backgroundPosition: "100% center",
        } as React.CSSProperties
      }
    >
      {children}
    </Component>
  );
}

export const ShimmerText = TextShimmerCore;
