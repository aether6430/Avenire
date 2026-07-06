import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import {
  resolveWorkspaceFileContentRouteError,
  WORKSPACE_FILE_CONTENT_ERROR,
  workspaceFileContentPatchSchema,
} from "./workspace-file-content-route-model";
import { handleWorkspaceFileContentPatch } from "./workspace-file-content-route-patch";

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
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = workspaceFileContentPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    return await handleWorkspaceFileContentPatch({
      body: parsed.data,
      fileUuid,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileContentRouteError(
          error,
          WORKSPACE_FILE_CONTENT_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
