import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleUserSettingsRouteGet } from "./user-settings-route-get";
import { handleUserSettingsRoutePut } from "./user-settings-route-put";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleUserSettingsRouteGet(user.id);
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleUserSettingsRoutePut({
    request,
    userId: user.id,
  });
}
