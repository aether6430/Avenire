import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleGoogleDrivePickerTokenRouteGet } from "./imports-google-drive-picker-token-route-get";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleGoogleDrivePickerTokenRouteGet({
    userId: user.id,
  });
}
