import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFileGet } from "./workspace-file-route-get";
import {
  handleWorkspaceFileDelete,
  handleWorkspaceFilePatch,
} from "./workspace-file-route-mutations";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  return await handleWorkspaceFileGet({
    fileUuid,
    userId: user.id,
    workspaceUuid,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    folderId?: string;
    metadata?: Record<string, unknown>;
    page?: {
      bannerUrl?: string | null;
      icon?: string | null;
      properties?: Record<string, unknown>;
    };
  };
  return await handleWorkspaceFilePatch({
    body,
    fileUuid,
    userId: user.id,
    workspaceUuid,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  return await handleWorkspaceFileDelete({
    fileUuid,
    userId: user.id,
    workspaceUuid,
  });
}
