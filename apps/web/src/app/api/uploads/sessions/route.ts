import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import {
  resolveUploadSessionRouteError,
  UPLOAD_SESSION_CREATE_ERROR,
} from "./upload-session-route-model";
import { handleUploadSessionsPost } from "./upload-session-route-post";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleUploadSessionsPost({
      request,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUploadSessionRouteError(
          error,
          UPLOAD_SESSION_CREATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
