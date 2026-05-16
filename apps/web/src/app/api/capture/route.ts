import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleCaptureMisconception } from "./capture-route-misconception";
import {
  type CaptureRequestBody,
  resolveCaptureKind,
} from "./capture-route-model";
import { handleCaptureNote } from "./capture-route-note";
import { handleCaptureTask } from "./capture-route-task";

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CaptureRequestBody;
  const kind = resolveCaptureKind(body.kind);
  if (!kind) {
    return NextResponse.json(
      { error: "Invalid capture kind" },
      { status: 400 }
    );
  }

  if (kind === "task") {
    return await handleCaptureTask({
      body,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  }

  if (kind === "note") {
    return await handleCaptureNote({
      body,
      rootFolderId: ctx.workspace.rootFolderId,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  }

  return await handleCaptureMisconception({
    body,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
