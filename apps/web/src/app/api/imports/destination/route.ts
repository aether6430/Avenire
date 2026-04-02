import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDataImportOverview,
  saveDataImportDestination,
} from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

const destinationSchema = z.object({
  folderId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

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

  const parsed = destinationSchema.safeParse(
    await request.json().catch(() => ({})),
  );
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
      { status: 400 },
    );
  }
}
