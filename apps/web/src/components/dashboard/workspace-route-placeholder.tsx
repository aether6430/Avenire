"use client";

import { Spinner } from "@avenire/ui/components/spinner";

export function WorkspaceRoutePlaceholder({
  label = "Loading workspace...",
}: {
  label?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center">
      <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        {label}
      </div>
    </div>
  );
}
