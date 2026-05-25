"use client";

import { Skeleton } from "@avenire/ui/components/skeleton";

export function WorkspaceRoutePlaceholder({
  label = "Loading workspace...",
  pending = true,
}: {
  label?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-6">
      <div
        aria-busy={pending}
        className="w-full max-w-3xl rounded-xl border border-border/40 bg-background/70 p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-[70%]" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="mt-5 flex items-center justify-center text-muted-foreground text-xs">
          {label}
        </div>
      </div>
    </div>
  );
}
