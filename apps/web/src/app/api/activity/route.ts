import { listChatsForUser, listWorkspaceFiles } from "@avenire/database";
import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export type ActivityType = "chat" | "file" | "note";
export type ActivityAction = "created" | "updated";

export interface ActivityEvent {
  action: ActivityAction;
  createdAt: string;
  href: string;
  id: string;
  subtitle?: string;
  title: string;
  type: ActivityType;
}

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Number.parseInt(searchParams.get("limit") ?? "10", 10),
    50
  );

  const events: ActivityEvent[] = [];

  const chats = await listChatsForUser(ctx.user.id, ctx.workspace.workspaceId);
  for (const chat of chats.slice(0, limit)) {
    const isNew = chat.createdAt === chat.updatedAt;
    events.push({
      id: `chat-${chat.id}`,
      type: "chat",
      action: isNew ? "created" : "updated",
      title: chat.title,
      href: `/dashboard/chats/${chat.slug}`,
      createdAt: chat.updatedAt,
    });
  }

  const files = await listWorkspaceFiles(
    ctx.workspace.workspaceId,
    ctx.user.id
  );
  for (const file of files.slice(0, limit)) {
    const isNew = file.createdAt === file.updatedAt;
    const isNote = file.isNote;
    events.push({
      id: `file-${file.id}`,
      type: isNote ? "note" : "file",
      action: isNew ? "created" : "updated",
      title: file.name,
      href: `/dashboard/files/${file.workspaceId}/folder/${file.folderId}?file=${file.id}`,
      createdAt: file.updatedAt,
    });
  }

  events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ events: events.slice(0, limit) });
}
