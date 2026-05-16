import { NextResponse } from "next/server";
import { listWorkspacePropertyRegistry } from "@/lib/file-data";
import { resolveWorkspaceSupportRouteContext } from "../workspace-support-route-context";
import { resolveWorkspaceSupportRouteError } from "../workspace-support-route-model";

export async function handleWorkspacePropertyRegistryRouteGet(input: {
  workspaceUuid: string;
}) {
  const context = await resolveWorkspaceSupportRouteContext({
    workspaceUuid: input.workspaceUuid,
  });
  if (!context.ok) {
    return context.response;
  }

  try {
    const properties = await listWorkspacePropertyRegistry(
      context.workspaceUuid
    );
    return NextResponse.json({ properties });
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
