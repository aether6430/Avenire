import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleExtensionDestinationsRouteGet } from "./extension-destinations-route-get";
import { handleExtensionDestinationsRoutePost } from "./extension-destinations-route-post";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleExtensionDestinationsRouteGet({
    userId: user.id,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleExtensionDestinationsRoutePost({
    request,
    userId: user.id,
  });
}
