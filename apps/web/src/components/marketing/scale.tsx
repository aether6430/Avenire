import { cn } from "@/lib/utils";
import React from "react";

export const Scale = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 m-auto h-full w-full rounded-lg border border-(--pattern-fg) bg-white dark:bg-neutral-900",
        className,
      )}
    ></div>
  );
};
