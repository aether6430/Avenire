import { createFolder } from "@/lib/file-data";

const NOTES_FOLDER_NAME = "Notes";

export async function ensureNotesFolder(input: {
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}) {
  const folder = await createFolder(
    input.workspaceId,
    input.rootFolderId,
    NOTES_FOLDER_NAME,
    input.userId
  );

  if (!folder) {
    throw new Error("Unable to create or resolve the Notes folder.");
  }

  return folder;
}
