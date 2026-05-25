import { resolveWorkspaceSupportRouteError } from "../../../workspace-support-route-model";
import { handleWorkspaceFileCaptionsRouteGet } from "./workspace-file-captions-route-get";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
    const { workspaceUuid, fileUuid } = await context.params;
    return await handleWorkspaceFileCaptionsRouteGet({
      fileUuid,
      workspaceUuid,
    });
  } catch (error) {
    const failure = resolveWorkspaceSupportRouteError(error, {
      fallback: "Unable to load captions.",
    });
    return new Response(failure.error, {
      status: failure.status,
    });
  }
}
