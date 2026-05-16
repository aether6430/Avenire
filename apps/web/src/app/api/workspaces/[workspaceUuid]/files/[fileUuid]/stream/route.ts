import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFileStreamGet } from "./workspace-file-stream-route-get";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
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
}
