import { NextResponse } from "next/server";
import { listWorkspaceShareSuggestions } from "@/lib/file-data";
import {
  resolveWorkspaceShareSuggestionsQuery,
  resolveWorkspaceShareSuggestionsRouteError,
  WORKSPACE_SHARE_SUGGESTIONS_ERROR,
} from "./workspace-share-suggestions-route-model";

export async function handleWorkspaceShareSuggestionsRouteGet(input: {
  request: Request;
  user: {
    email: string | null | undefined;
    id: string;
  };
  workspaceUuid: string;
}) {
  try {
    const query = resolveWorkspaceShareSuggestionsQuery(input.request);
    const suggestions = await listWorkspaceShareSuggestions({
      workspaceId: input.workspaceUuid,
      userId: input.user.id,
      userEmail: input.user.email,
      query,
      limit: 8,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceShareSuggestionsRouteError(
          error,
          WORKSPACE_SHARE_SUGGESTIONS_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
