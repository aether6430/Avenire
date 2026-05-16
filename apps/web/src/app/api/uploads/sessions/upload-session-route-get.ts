import { NextResponse } from "next/server";
import { getUploadSession } from "@/lib/upload-session-store";

export async function handleUploadSessionGet(input: {
  sessionId: string;
  userId: string;
}) {
  const session = await getUploadSession(input.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.userId !== input.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session });
}
