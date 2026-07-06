const ACTIVE_MISCONCEPTION_CACHE_TOOL_NAMES = [
  "list_misconceptions",
  "misconception_signal_active_misconceptions",
] as const;

export async function invalidateActiveMisconceptionCaches(
  input: {
    userId: string;
    workspaceId: string;
  },
  dependencies: {
    invalidateToolResultScope?: (input: {
      scope: Record<string, unknown>;
      toolName: string;
    }) => Promise<void>;
  } = {}
) {
  const invalidateToolResultScope =
    dependencies.invalidateToolResultScope ??
    (await import("@/lib/ai-tool-result-cache")).invalidateToolResultScope;

  await Promise.allSettled(
    ACTIVE_MISCONCEPTION_CACHE_TOOL_NAMES.map((toolName) =>
      invalidateToolResultScope({
        scope: {
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
        toolName,
      })
    )
  );
}
