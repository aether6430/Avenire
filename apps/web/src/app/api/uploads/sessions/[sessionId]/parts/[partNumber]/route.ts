import { NextResponse } from "next/server";
import {
  resolveUploadSessionPartRouteError,
  UPLOAD_SESSION_PART_UPLOAD_ERROR,
} from "../upload-session-parts-model";
import { handleUploadSessionPartPut } from "./upload-session-part-put";

export async function PUT(
  request: Request,
  context: { params: Promise<{ sessionId: string; partNumber: string }> }
) {
  try {
    const { sessionId, partNumber } = await context.params;

    return await handleUploadSessionPartPut({
      request,
      sessionId,
      partNumberRaw: partNumber,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUploadSessionPartRouteError(
          error,
          UPLOAD_SESSION_PART_UPLOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
