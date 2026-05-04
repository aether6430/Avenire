import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createWorkspaceNoteFile,
  listWorkspaceFiles,
  resolveWorkspaceForUser,
} from "@/lib/file-data";

const AI_INSTRUCTIONS_FILE_NAME = "Auri Instructions.md";
const DEFAULT_AI_INSTRUCTIONS = [
  "# Auri Instructions",
  "",
  "Use this note to steer how Auri responds to you.",
  "",
  "## Preferences",
  "- ",
].join("\n");

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const files = await listWorkspaceFiles(workspace.workspaceId, session.user.id);
  const existing = files.find(
    (file) =>
      file.folderId === workspace.rootFolderId &&
      file.name.toLowerCase() === AI_INSTRUCTIONS_FILE_NAME.toLowerCase()
  );

  const file =
    existing ??
    (await createWorkspaceNoteFile({
      content: DEFAULT_AI_INSTRUCTIONS,
      folderId: workspace.rootFolderId,
      metadata: { type: "note", aiInstructions: true },
      name: AI_INSTRUCTIONS_FILE_NAME,
      userId: session.user.id,
      workspaceId: workspace.workspaceId,
    }));

  return NextResponse.json({
    fileId: file.id,
    fileName: file.name,
    rootFolderId: workspace.rootFolderId,
    workspaceId: workspace.workspaceId,
    workspaceUuid: workspace.workspaceId,
  });
}
