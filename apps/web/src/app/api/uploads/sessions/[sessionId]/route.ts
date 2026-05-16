import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleUploadSessionGet } from "../upload-session-route-get";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;

  return await handleUploadSessionGet({
    sessionId,
    userId: user.id,
  });
}
