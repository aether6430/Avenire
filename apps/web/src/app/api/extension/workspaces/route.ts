import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleExtensionWorkspacesRouteGet } from "./extension-workspaces-route-get";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleExtensionWorkspacesRouteGet({
    userId: user.id,
  });
}
