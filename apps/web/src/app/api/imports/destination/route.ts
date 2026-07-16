import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import {
  getDataImportOverview,
  saveDataImportDestination,
} from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";
import { importDestinationRequestSchema } from "../import-route-contracts";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await getDataImportOverview(user.id);
  return NextResponse.json({ destination: overview.destination });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, importDestinationRequestSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const destination = await saveDataImportDestination({
      folderId: parsed.data.folderId,
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
    });
    return NextResponse.json({ destination });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save import destination.",
      },
      { status: 400 }
    );
  }
}
