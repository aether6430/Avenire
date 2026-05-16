import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  handleFlashcardCardRouteDelete,
  handleFlashcardCardRoutePatch,
} from "./flashcard-card-route-mutations";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await context.params;
  return await handleFlashcardCardRoutePatch({
    cardId,
    request,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await context.params;
  return await handleFlashcardCardRouteDelete({
    cardId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
