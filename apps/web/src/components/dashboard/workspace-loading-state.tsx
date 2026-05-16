export function WorkspaceLoadingState({
  compact = false,
  label = "Loading workspace...",
}: {
  compact?: boolean;
  label?: string;
}) {
  const loadingBadge = (
    <div className="inline-flex items-center gap-3 rounded-lg bg-secondary/40 px-4 py-3">
      <span
        aria-hidden="true"
        className="relative flex size-4 items-center justify-center"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-foreground/10 [animation-duration:1.2s]" />
        <span className="relative size-2 rounded-full bg-foreground/70" />
      </span>
      <span className="font-medium text-[13px] text-foreground/88">
        {label}
      </span>
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-secondary/40 px-4 py-8">
        {loadingBadge}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      {loadingBadge}
    </div>
  );
}
