import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFileStreamGet } from "./workspace-file-stream-route-get";
import {
  resolveWorkspaceFileStreamRouteError,
  WORKSPACE_FILE_STREAM_ERROR,
} from "./workspace-file-stream-route-model";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { workspaceUuid, fileUuid } = await context.params;

    return await handleWorkspaceFileStreamGet({
      request,
      userId: user.id,
      workspaceUuid,
      fileUuid,
    });
  } catch (error) {
    return new Response(
      resolveWorkspaceFileStreamRouteError(error, WORKSPACE_FILE_STREAM_ERROR),
      { status: 500 }
    );
  }
}
