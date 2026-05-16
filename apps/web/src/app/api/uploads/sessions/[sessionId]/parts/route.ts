import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleUploadSessionPartsPost } from "./upload-session-parts-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;

  return await handleUploadSessionPartsPost({
    request,
    sessionId,
    userId: user.id,
  });
}
