import { NextResponse } from "next/server";
import { importGoogleDriveFiles } from "@/lib/imports";
import {
  parseGoogleDriveImportRoutePayload,
  resolveImportExecutionRouteError,
} from "../../imports-execution-route-model";

export async function handleGoogleDriveImportRoutePost(input: {
  request: Request;
  userId: string;
}) {
  const parsed = parseGoogleDriveImportRoutePayload(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await importGoogleDriveFiles({
      fileIds: parsed.data.fileIds,
      userId: input.userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = resolveImportExecutionRouteError(error, {
      fallback: "Unable to import files.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
