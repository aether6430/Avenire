import { NextResponse } from "next/server";
import { normalizeFlashcardSetId } from "@/lib/flashcard-set-id";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardSetRouteGet } from "./flashcard-set-route-get";
import {
  handleFlashcardSetRouteDelete,
  handleFlashcardSetRoutePatch,
} from "./flashcard-set-route-mutations";

export async function GET(
  _request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId: rawSetId } = await context.params;
  const setId = normalizeFlashcardSetId(rawSetId);
  if (!setId) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }
  return await handleFlashcardSetRouteGet({
    setId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId: rawSetId } = await context.params;
  const setId = normalizeFlashcardSetId(rawSetId);
  if (!setId) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }
  return await handleFlashcardSetRoutePatch({
    request,
    setId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId: rawSetId } = await context.params;
  const setId = normalizeFlashcardSetId(rawSetId);
  if (!setId) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }
  return await handleFlashcardSetRouteDelete({
    setId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
