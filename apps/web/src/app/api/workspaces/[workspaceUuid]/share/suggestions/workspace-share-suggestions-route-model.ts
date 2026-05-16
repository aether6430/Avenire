export function resolveWorkspaceShareSuggestionsQuery(request: Request) {
  return new URL(request.url).searchParams.get("q")?.trim() ?? "";
}
