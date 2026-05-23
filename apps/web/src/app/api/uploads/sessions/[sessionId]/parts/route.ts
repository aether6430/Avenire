import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import {
  resolveUploadSessionRouteError,
  UPLOAD_SESSION_PARTS_ERROR,
} from "../../upload-session-route-model";
import { handleUploadSessionPartsPost } from "./upload-session-parts-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUploadSessionRouteError(
          error,
          UPLOAD_SESSION_PARTS_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
