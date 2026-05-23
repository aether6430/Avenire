import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteWorkspaceForUser, listWorkspacesForUser } from "@/lib/file-data";
import { SUDO_COOKIE_NAME, validateSudoCookie } from "@/lib/sudo";
import {
  resolveWorkspaceDeleteFailure,
  resolveWorkspaceRouteError,
  WORKSPACE_ROUTE_DELETE_ERROR,
} from "./workspace-route-model";

export async function handleWorkspaceRouteDelete(input: {
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const cookieStore = await cookies();
    const sudoCookie = cookieStore.get(SUDO_COOKIE_NAME)?.value ?? null;
    const hasSudo = validateSudoCookie({
      userId: input.userId,
      cookieValue: sudoCookie,
    });
    if (!hasSudo) {
      return NextResponse.json(
        { error: "Sudo verification required" },
        { status: 403 }
      );
    }

    const result = await deleteWorkspaceForUser(
      input.userId,
      input.workspaceUuid
    );
    if (result.status !== "deleted") {
      const failure = resolveWorkspaceDeleteFailure(result.status);
      return NextResponse.json(
        { error: failure.error },
        { status: failure.status }
      );
    }

    const workspaces = await listWorkspacesForUser(input.userId);
    return NextResponse.json({ ok: true, workspaces });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceRouteError(error, WORKSPACE_ROUTE_DELETE_ERROR),
      },
      { status: 500 }
    );
  }
}
