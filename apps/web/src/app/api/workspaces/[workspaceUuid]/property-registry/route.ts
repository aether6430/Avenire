import { handleWorkspacePropertyRegistryRouteGet } from "./workspace-property-registry-route-get";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const { workspaceUuid } = await context.params;
  return await handleWorkspacePropertyRegistryRouteGet({
    workspaceUuid,
  });
}
