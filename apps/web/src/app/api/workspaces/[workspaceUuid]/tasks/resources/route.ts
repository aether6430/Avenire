import { NextResponse } from "next/server";
import {
  ensureWorkspaceAccessForUser,
  getSessionUser,
} from "@/lib/workspace";
import { listChatsForUser } from "@/lib/chat-data";
import {
  listWorkspaceFiles,
  listWorkspaceFolders,
  listWorkspacesForUser,
} from "@/lib/file-data";
import type {
  WorkspaceTaskResourceOption,
  WorkspaceTaskResourceType,
} from "@/lib/tasks";

function normalizeQuery(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function buildFileOption(
  workspaceUuid: string,
  file: Awaited<ReturnType<typeof listWorkspaceFiles>>[number]
): WorkspaceTaskResourceOption {
  return {
    href: `/workspace/files/${workspaceUuid}/folder/${file.folderId}?file=${file.id}`,
    resourceId: file.id,
    resourceType: "file",
    subtitle: file.folderId ? "File" : null,
    title: file.name,
  };
}

function buildFolderOption(
  workspaceUuid: string,
  folder: Awaited<ReturnType<typeof listWorkspaceFolders>>[number]
): WorkspaceTaskResourceOption {
  return {
    href: `/workspace/files/${workspaceUuid}/folder/${folder.id}`,
    resourceId: folder.id,
    resourceType: "folder",
    subtitle: folder.parentId ? "Folder" : "Workspace root",
    title: folder.name,
  };
}

function buildChatOption(
  chat: Awaited<ReturnType<typeof listChatsForUser>>[number]
): WorkspaceTaskResourceOption {
  return {
    href: `/workspace/chats/${chat.slug}`,
    resourceId: chat.slug,
    resourceType: "chat",
    subtitle: "Method",
    title: chat.title,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
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

  const searchParams = new URL(request.url).searchParams;
  const query = normalizeQuery(searchParams.get("q"));

  const [files, folders, chats] = await Promise.all([
    listWorkspaceFiles(workspaceUuid, user.id),
    listWorkspaceFolders(workspaceUuid, user.id),
    listChatsForUser(user.id, workspaceUuid),
  ]);

  const options = [
    ...files.map((file) => buildFileOption(workspaceUuid, file)),
    ...folders.map((folder) => buildFolderOption(workspaceUuid, folder)),
    ...chats.map((chat) => buildChatOption(chat)),
  ].filter((item) => {
    if (!query) {
      return true;
    }

    return [item.title, item.subtitle ?? "", item.resourceId]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return NextResponse.json({
    resources: options.slice(0, 100),
  });
}
