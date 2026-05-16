import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleNoteRoutePatch } from "./note-route-patch";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    content?: string;
    page?: {
      bannerUrl?: string | null;
      icon?: string | null;
      properties?: Record<string, unknown>;
    };
  };

  return await handleNoteRoutePatch({
    body,
    noteId,
    userId: user.id,
  });
}
