import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { importGoogleDriveFiles } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";
import { googleDriveImportRequestSchema } from "../../import-route-contracts";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, googleDriveImportRequestSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await importGoogleDriveFiles({
      fileIds: [...parsed.data.fileIds],
      userId: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to import files.",
      },
      { status: 400 }
    );
  }
}
