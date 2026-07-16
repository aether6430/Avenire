import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { handleWorkspaceTrashRouteGet } from "./workspace-trash-route-get";
import {
  resolveWorkspaceTrashRouteError,
  WORKSPACE_TRASH_LOAD_ERROR,
  WORKSPACE_TRASH_MUTATION_ERROR,
  WorkspaceTrashMutationRequest,
} from "./workspace-trash-route-model";
import {
  handleWorkspaceTrashRouteDelete,
  handleWorkspaceTrashRouteRestore,
} from "./workspace-trash-route-mutations";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await handleWorkspaceTrashRouteGet({ workspaceUuid });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceTrashRouteError(
          error,
          WORKSPACE_TRASH_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseJsonRequest(
      request,
      WorkspaceTrashMutationRequest
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return await handleWorkspaceTrashRouteRestore({
      body: parsed.data,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceTrashRouteError(
          error,
          WORKSPACE_TRASH_MUTATION_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseJsonRequest(
      request,
      WorkspaceTrashMutationRequest
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return await handleWorkspaceTrashRouteDelete({
      body: parsed.data,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceTrashRouteError(
          error,
          WORKSPACE_TRASH_MUTATION_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
