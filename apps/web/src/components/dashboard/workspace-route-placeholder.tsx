"use client";

import { Spinner } from "@avenire/ui/components/spinner";

export function WorkspaceRoutePlaceholder({
  label = "Loading workspace...",
}: {
  label?: string;
}) {
  return (
    <div className="flex h-full min-h-[100dvh] flex-1 items-center justify-center bg-background">
      <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        {label}
      </div>
    </div>
  );
}
