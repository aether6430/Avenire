"use client";

import { ChatSpinner } from "@/components/chat/spinner";
import { cn } from "@/lib/utils";

export function WorkspaceLoadingState({
  compact = false,
  label = "Loading workspace...",
}: {
  compact?: boolean;
  label?: string;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-secondary/40 px-4 py-8">
        <ChatSpinner className="px-0 py-0" messages={[label]} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      <div
        className={cn(
          "inline-flex items-center rounded-lg bg-secondary/40 px-4 py-3"
        )}
      >
        <ChatSpinner className="px-0 py-0" messages={[label]} />
      </div>
    </div>
  );
}
