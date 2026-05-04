import { NextResponse } from "next/server";
import { listWorkspacesForUser } from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await listWorkspacesForUser(user.id);
  return NextResponse.json({ workspaces });
}
