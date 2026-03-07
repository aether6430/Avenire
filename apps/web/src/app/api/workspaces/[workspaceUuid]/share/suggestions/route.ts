import { listWorkspaceShareSuggestions } from "@/lib/file-data";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const suggestions = await listWorkspaceShareSuggestions({
    workspaceId: workspaceUuid,
    userId: user.id,
    userEmail: user.email,
    query,
    limit: 8,
  });

  return NextResponse.json({ suggestions });
}
