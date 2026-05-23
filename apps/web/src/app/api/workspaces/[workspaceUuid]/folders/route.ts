import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import {
  resolveWorkspaceFolderCreateRouteError,
  WORKSPACE_FOLDER_CREATE_ERROR,
} from "./workspace-folders-route-model";
import { handleWorkspaceFoldersPost } from "./workspace-folders-route-post";

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
    return await handleWorkspaceFoldersPost({
      request,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFolderCreateRouteError(
          error,
          WORKSPACE_FOLDER_CREATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
