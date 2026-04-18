"use client";

import { Spinner } from "@avenire/ui/components/spinner";

export function WorkspaceLoadingState({
  compact = false,
  label = "Loading workspace...",
}: {
  compact?: boolean;
  label?: string;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/40 px-4 py-8 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        {label}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      <div className="inline-flex items-center gap-2 rounded-lg bg-secondary/40 px-4 py-3 text-muted-foreground text-sm">
          <Spinner className="size-4" />
          {label}
      </div>
    </div>
  );
}
