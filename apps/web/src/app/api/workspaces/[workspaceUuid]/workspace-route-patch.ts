import { NextResponse } from "next/server";
import {
  listWorkspacesForUser,
  updateWorkspaceLogoForUser,
} from "@/lib/file-data";
import {
  normalizeWorkspaceLogoInput,
  resolveWorkspacePatchFailure,
} from "./workspace-route-model";

export async function handleWorkspaceRoutePatch(input: {
  request: Request;
  userId: string;
  workspaceUuid: string;
}) {
  const body = (await input.request.json().catch(() => ({}))) as {
    logo?: string | null;
  };

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
}
