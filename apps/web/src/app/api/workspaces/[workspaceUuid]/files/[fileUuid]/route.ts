import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { parseJsonRequest } from "@/lib/api-request";
import { handleWorkspaceFileGet } from "./workspace-file-route-get";
import {
  resolveWorkspaceFileRouteError,
  WORKSPACE_FILE_DELETE_ERROR,
  WORKSPACE_FILE_LOAD_ERROR,
  WORKSPACE_FILE_UPDATE_ERROR,
  workspaceFilePatchSchema,
} from "./workspace-file-route-model";
import {
  handleWorkspaceFileDelete,
  handleWorkspaceFilePatch,
} from "./workspace-file-route-mutations";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRouteError(error, WORKSPACE_FILE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid, fileUuid } = await context.params;
    const parsed = await parseJsonRequest(request, workspaceFilePatchSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return await handleWorkspaceFilePatch({
      body: parsed.data,
      fileUuid,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRouteError(
          error,
          WORKSPACE_FILE_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRouteError(
          error,
          WORKSPACE_FILE_DELETE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
