import { handleWorkspaceFileCaptionsRouteGet } from "./workspace-file-captions-route-get";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const { workspaceUuid, fileUuid } = await context.params;
  return await handleWorkspaceFileCaptionsRouteGet({
    fileUuid,
    workspaceUuid,
  });
}
