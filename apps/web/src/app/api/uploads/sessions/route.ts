import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleUploadSessionsPost } from "./upload-session-route-post";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleUploadSessionsPost({
    request,
    userId: user.id,
  });
}
