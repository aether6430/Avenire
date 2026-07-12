import { NextResponse } from "next/server";
import {
  listWorkspacesForUser,
  updateWorkspaceLogoForUser,
} from "@/lib/file-data";
import {
  normalizeWorkspaceLogoInput,
  resolveWorkspacePatchFailure,
  resolveWorkspaceRouteError,
  WORKSPACE_ROUTE_PATCH_ERROR,
  workspaceLogoPatchSchema,
} from "./workspace-route-model";
import { parseJsonRequest } from "@/lib/api-request";

export async function handleWorkspaceRoutePatch(input: {
  request: Request;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const parsed = await parseJsonRequest(input.request, workspaceLogoPatchSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;

    const result = await updateWorkspaceLogoForUser(
      input.userId,
      input.workspaceUuid,
      normalizeWorkspaceLogoInput(body.logo)
    );

    if (result.status !== "updated") {
      const failure = resolveWorkspacePatchFailure(result.status);
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
        error: resolveWorkspaceRouteError(error, WORKSPACE_ROUTE_PATCH_ERROR),
      },
      { status: 500 }
    );
  }
}
