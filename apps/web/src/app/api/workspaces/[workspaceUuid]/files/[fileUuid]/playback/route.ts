import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFilePlaybackGet } from "./workspace-file-playback-route-get";
import {
  resolveWorkspaceFilePlaybackRouteError,
  WORKSPACE_FILE_PLAYBACK_ERROR,
} from "./workspace-file-playback-route-model";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { workspaceUuid, fileUuid } = await context.params;

    return await handleWorkspaceFilePlaybackGet({
      userId: user.id,
      workspaceUuid,
      fileUuid,
    });
  } catch (error) {
    return new Response(
      resolveWorkspaceFilePlaybackRouteError(
        error,
        WORKSPACE_FILE_PLAYBACK_ERROR
      ),
      { status: 500 }
    );
  }
}
