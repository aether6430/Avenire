import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleExtensionMeRouteGet } from "./extension-me-route-get";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleExtensionMeRouteGet({
    user,
  });
}
