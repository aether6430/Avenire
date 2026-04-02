import { NextResponse } from "next/server";
import {
  importGoogleDriveFiles,
  parseGoogleDriveImportPayload,
} from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { fileIds: string[] };
  try {
    payload = parseGoogleDriveImportPayload(
      await request.json().catch(() => ({})),
    );
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await importGoogleDriveFiles({
      fileIds: payload.fileIds,
      userId: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to import files.",
      },
      { status: 400 },
    );
  }
}
