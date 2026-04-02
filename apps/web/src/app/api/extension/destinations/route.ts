import {
  createExtensionDestinationPreset,
  listExtensionDestinationPresets,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listWorkspaceFolders, listWorkspacesForUser, userCanEditFolder } from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";

const createPresetSchema = z.object({
  folderId: z.string().uuid(),
  label: z.string().trim().max(80).optional(),
  workspaceId: z.string().uuid(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presets = await listExtensionDestinationPresets(user.id);
  return NextResponse.json({
    destinations: presets.map((preset) => ({
      ...preset,
      createdAt: preset.createdAt.toISOString(),
      updatedAt: preset.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createPresetSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const summaries = await listWorkspacesForUser(user.id);
  const workspace = summaries.find(
    (entry) => entry.workspaceId === parsed.data.workspaceId
  );
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const canEdit = await userCanEditFolder({
    workspaceId: workspace.workspaceId,
    folderId: parsed.data.folderId,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }

  const folders = await listWorkspaceFolders(workspace.workspaceId, user.id);
  const folder = folders.find((entry) => entry.id === parsed.data.folderId);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const preset = await createExtensionDestinationPreset({
    userId: user.id,
    workspaceId: workspace.workspaceId,
    organizationId: workspace.organizationId,
    folderId: folder.id,
    label: parsed.data.label ?? folder.name,
    workspaceName: workspace.name,
    folderName: folder.name,
  });

  return NextResponse.json(
    {
      destination: {
        ...preset,
        createdAt: preset.createdAt.toISOString(),
        updatedAt: preset.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
