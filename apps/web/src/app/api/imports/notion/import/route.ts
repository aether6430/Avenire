import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleNotionImportRoutePost } from "./imports-notion-import-route-post";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleNotionImportRoutePost({
    request,
    userId: user.id,
  });
}
