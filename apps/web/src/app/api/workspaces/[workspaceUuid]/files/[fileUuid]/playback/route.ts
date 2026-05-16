import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFilePlaybackGet } from "./workspace-file-playback-route-get";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
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
}
