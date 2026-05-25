import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveExtensionRouteError } from "../extension-route-model";
import { handleExtensionWorkspacesRouteGet } from "./extension-workspaces-route-get";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleExtensionWorkspacesRouteGet({
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to load extension workspaces.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
