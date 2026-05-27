import { resolveApiErrorMessage } from "@/lib/api-error-message";

import { z } from "zod";

const workspaceFolderCreatePayloadSchema = z.object({
  parentId: z.union([z.string(), z.null()]),
  name: z.string(),
});

export const WORKSPACE_FOLDER_CREATE_INVALID_PAYLOAD_ERROR =
  "Missing parentId or name";
export const WORKSPACE_FOLDER_CREATE_ERROR = "Unable to create folder";

export function normalizeWorkspaceFoldersRouteWorkspaceId(
  workspaceUuid: string
) {
  return workspaceUuid.trim();
}

export function parseWorkspaceFolderCreatePayload(payload: unknown):
  | {
      success: true;
      data: {
        parentId: string | null;
        name: string;
      };
    }
  | {
      success: false;
      error: string;
    } {
  const parsed = workspaceFolderCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: WORKSPACE_FOLDER_CREATE_INVALID_PAYLOAD_ERROR,
    };
  }

  const name = parsed.data.name.trim();
  if (!name) {
    return {
      success: false,
      error: WORKSPACE_FOLDER_CREATE_INVALID_PAYLOAD_ERROR,
    };
  }

  const parentId =
    typeof parsed.data.parentId === "string"
      ? parsed.data.parentId.trim() || null
      : null;

  return {
    success: true,
    data: {
      parentId,
      name,
    },
  };
}

export function buildWorkspaceFolderCreateResponse(input: { folder: unknown }) {
  return {
    folder: input.folder,
  };
}

export function resolveWorkspaceFolderCreateRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
