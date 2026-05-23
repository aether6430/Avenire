import { NextResponse } from "next/server";
import { getUploadSession } from "@/lib/upload-session-store";
import {
  resolveUploadSessionRouteError,
  UPLOAD_SESSION_LOAD_ERROR,
} from "./upload-session-route-model";

export async function handleUploadSessionGet(input: {
  sessionId: string;
  userId: string;
}) {
  try {
    const session = await getUploadSession(input.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userId !== input.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUploadSessionRouteError(error, UPLOAD_SESSION_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
