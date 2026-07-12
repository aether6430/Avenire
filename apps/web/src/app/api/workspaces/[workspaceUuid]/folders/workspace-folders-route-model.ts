import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

export const workspaceFolderCreatePayloadSchema = Schema.Struct({
  parentId: Schema.NullOr(Schema.String),
  name: Schema.String,
});

export const WORKSPACE_FOLDER_CREATE_INVALID_PAYLOAD_ERROR =
  "Missing parentId or name";
export const WORKSPACE_FOLDER_CREATE_ERROR = "Unable to create folder";

export function normalizeWorkspaceFoldersRouteWorkspaceId(
  workspaceUuid: string
) {
  return workspaceUuid.trim();
}

export function normalizeWorkspaceFolderCreatePayload(
  payload: typeof workspaceFolderCreatePayloadSchema.Type
):
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
  const name = payload.name.trim();
  if (!name) {
    return {
      success: false,
      error: WORKSPACE_FOLDER_CREATE_INVALID_PAYLOAD_ERROR,
    };
  }

  const parentId =
    typeof payload.parentId === "string"
      ? payload.parentId.trim() || null
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
