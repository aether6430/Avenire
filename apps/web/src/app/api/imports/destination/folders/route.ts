import { NextResponse } from "next/server";
import { listImportDestinationFolders } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId")?.trim() ?? "";
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 },
    );
  }

  try {
    const payload = await listImportDestinationFolders({
      userId: user.id,
      workspaceId,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load folders.",
      },
      { status: 400 },
    );
  }
}
