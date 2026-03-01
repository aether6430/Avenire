import { NextResponse } from "next/server";
import { createWorkspaceForUser } from "@/lib/file-data";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    workspaceUuid: ctx.workspace.workspaceId,
    organizationId: ctx.workspace.organizationId,
    rootFolderUuid: ctx.workspace.rootFolderId,
  });
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const workspace = await createWorkspaceForUser(ctx.user.id, body.name ?? "New Workspace");

  return NextResponse.json({ workspace }, { status: 201 });
}
