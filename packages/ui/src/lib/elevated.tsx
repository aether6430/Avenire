"use client";

import * as React from "react";

import { cn } from "./utils";
import { surfaceClasses } from "./surface-classes";
import { SurfaceProvider, useSurface } from "./surface-context";

function clampSurface(level: number) {
  return Math.max(1, Math.min(8, level));
}

type ElevatedProps = React.HTMLAttributes<HTMLDivElement> & {
  offset?: number;
  shadowLevel?: number;
  surfaceLevel?: number;
};

const Elevated = React.forwardRef<HTMLDivElement, ElevatedProps>(
  (
    { children, className, offset = 1, shadowLevel, surfaceLevel, ...props },
    ref
  ) => {
    const parentSurface = useSurface();
    const level = clampSurface(surfaceLevel ?? parentSurface + offset);
    const shadow = clampSurface(shadowLevel ?? level);

    return (
      <SurfaceProvider value={level}>
        <div
          className={cn(surfaceClasses(level, shadow), className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SurfaceProvider>
    );
  }
);

Elevated.displayName = "Elevated";

export { Elevated, clampSurface };
export type { ElevatedProps };
