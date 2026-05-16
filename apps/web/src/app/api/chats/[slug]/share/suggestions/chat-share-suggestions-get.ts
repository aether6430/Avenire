import { NextResponse } from "next/server";
import { listWorkspaceShareSuggestions } from "@/lib/file-data";
import type { ChatShareRouteContext } from "../chat-share-route-context";

export async function handleChatShareSuggestionsGet(
  input: {
    request: Request;
  } & ChatShareRouteContext
) {
  const query = new URL(input.request.url).searchParams.get("q") ?? "";
  const suggestions = await listWorkspaceShareSuggestions({
    workspaceId: input.workspaceUuid,
    userId: input.user.id,
    userEmail: input.user.email,
    query,
    limit: 8,
  });

  void input.apiLogger.requestSucceeded(200, {
    slug: input.slug,
    queryLength: query.length,
    suggestionCount: suggestions.length,
  });

  return NextResponse.json({ suggestions });
}
