import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { extensionDestinationPreset } from "./schema";

export async function listExtensionDestinationPresets(userId: string) {
  return db
    .select({
      id: extensionDestinationPreset.id,
      label: extensionDestinationPreset.label,
      workspaceId: extensionDestinationPreset.workspaceId,
      organizationId: extensionDestinationPreset.organizationId,
      folderId: extensionDestinationPreset.folderId,
      workspaceName: extensionDestinationPreset.workspaceName,
      folderName: extensionDestinationPreset.folderName,
      createdAt: extensionDestinationPreset.createdAt,
      updatedAt: extensionDestinationPreset.updatedAt,
    })
    .from(extensionDestinationPreset)
    .where(eq(extensionDestinationPreset.userId, userId))
    .orderBy(desc(extensionDestinationPreset.updatedAt));
}

export async function getExtensionDestinationPreset(input: {
  presetId: string;
  userId: string;
}) {
  const [preset] = await db
    .select({
      id: extensionDestinationPreset.id,
      label: extensionDestinationPreset.label,
      workspaceId: extensionDestinationPreset.workspaceId,
      organizationId: extensionDestinationPreset.organizationId,
      folderId: extensionDestinationPreset.folderId,
      workspaceName: extensionDestinationPreset.workspaceName,
      folderName: extensionDestinationPreset.folderName,
      createdAt: extensionDestinationPreset.createdAt,
      updatedAt: extensionDestinationPreset.updatedAt,
    })
    .from(extensionDestinationPreset)
    .where(
      and(
        eq(extensionDestinationPreset.id, input.presetId),
        eq(extensionDestinationPreset.userId, input.userId)
      )
    )
    .limit(1);

  return preset ?? null;
}

export async function createExtensionDestinationPreset(input: {
  userId: string;
  workspaceId: string;
  organizationId: string;
  folderId: string;
  label: string;
  workspaceName: string;
  folderName: string;
}) {
  const now = new Date();
  const [preset] = await db
    .insert(extensionDestinationPreset)
    .values({
      userId: input.userId,
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      folderId: input.folderId,
      label: input.label.trim().slice(0, 80) || input.folderName,
      workspaceName: input.workspaceName,
      folderName: input.folderName,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return preset;
}

export async function updateExtensionDestinationPreset(input: {
  presetId: string;
  userId: string;
  workspaceId: string;
  organizationId: string;
  folderId: string;
  label: string;
  workspaceName: string;
  folderName: string;
}) {
  const [preset] = await db
    .update(extensionDestinationPreset)
    .set({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      folderId: input.folderId,
      label: input.label.trim().slice(0, 80) || input.folderName,
      workspaceName: input.workspaceName,
      folderName: input.folderName,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(extensionDestinationPreset.id, input.presetId),
        eq(extensionDestinationPreset.userId, input.userId)
      )
    )
    .returning();

  return preset ?? null;
}

export async function deleteExtensionDestinationPreset(input: {
  presetId: string;
  userId: string;
}) {
  const [preset] = await db
    .delete(extensionDestinationPreset)
    .where(
      and(
        eq(extensionDestinationPreset.id, input.presetId),
        eq(extensionDestinationPreset.userId, input.userId)
      )
    )
    .returning({ id: extensionDestinationPreset.id });

  return Boolean(preset);
}
