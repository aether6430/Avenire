import { NextResponse } from "next/server";
import { resolveWorkspaceSupportRouteError } from "../workspace-support-route-model";
import { handleWorkspacePropertyRegistryRouteGet } from "./workspace-property-registry-route-get";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const { workspaceUuid } = await context.params;
    return await handleWorkspacePropertyRegistryRouteGet({
      workspaceUuid,
    });
  } catch (error) {
    const failure = resolveWorkspaceSupportRouteError(error, {
      fallback: "Unable to load property definitions.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
