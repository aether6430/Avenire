import { Skeleton } from "@avenire/ui/components/skeleton";

export function WorkspaceLoadingState({
  compact = false,
  label = "Loading workspace...",
}: {
  compact?: boolean;
  label?: string;
}) {
  const loadingPanel = (
    <div
      aria-busy="true"
      className="w-full max-w-4xl rounded-xl border border-border/40 bg-background/70 p-5"
    >
      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-[72%]" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="mt-4 text-center text-muted-foreground text-xs">
        {label}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-center px-4 py-8">
        {loadingPanel}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      {loadingPanel}
    </div>
  );
}
