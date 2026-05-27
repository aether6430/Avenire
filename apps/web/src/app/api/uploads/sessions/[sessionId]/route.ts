import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleUploadSessionGet } from "../upload-session-route-get";
import {
  resolveUploadSessionRouteError,
  UPLOAD_SESSION_LOAD_ERROR,
} from "../upload-session-route-model";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await context.params;

    return await handleUploadSessionGet({
      sessionId,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUploadSessionRouteError(error, UPLOAD_SESSION_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
