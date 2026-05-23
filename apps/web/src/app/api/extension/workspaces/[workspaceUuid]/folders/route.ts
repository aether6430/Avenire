import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveExtensionRouteError } from "../../../extension-route-model";
import { handleExtensionWorkspaceFoldersRouteGet } from "./extension-workspace-folders-route-get";

export async function GET(
  request: Request,
  contextParams: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await contextParams.params;
    return await handleExtensionWorkspaceFoldersRouteGet({
      request,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to load extension folders.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
