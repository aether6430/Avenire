import { NextResponse } from "next/server";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { listFlashcardDueCountsByDayForUser } from "@/lib/flashcards";
import {
  buildFlashcardsRevisionCalendarResponse,
  parseFlashcardsRevisionCalendarRequest,
} from "./flashcards-revision-calendar-route-model";

export async function handleFlashcardsRevisionCalendarRouteGet(input: {
  activeOrganizationId: string | null;
  request: Request;
  userId: string;
}) {
  const parsed = parseFlashcardsRevisionCalendarRequest(input.request);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const workspace = await resolveWorkspaceForUser(
    input.userId,
    input.activeOrganizationId
  );
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const rows = await listFlashcardDueCountsByDayForUser(
    input.userId,
    workspace.workspaceId,
    parsed.from,
    parsed.to
  );

  return NextResponse.json(
    buildFlashcardsRevisionCalendarResponse({
      rows,
    })
  );
}
