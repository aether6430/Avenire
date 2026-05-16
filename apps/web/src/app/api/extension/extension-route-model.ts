import { z } from "zod";

const extensionDestinationPayloadSchema = z.object({
  folderId: z.string().uuid(),
  label: z.string().trim().max(80).optional(),
  workspaceId: z.string().uuid(),
});

export const EXTENSION_INVALID_PAYLOAD_ERROR = "Invalid payload";

export function normalizeExtensionRouteUuidInput(value: string) {
  return value.trim();
}

export function parseExtensionDestinationPayload(payload: unknown):
  | {
      success: true;
      data: {
        folderId: string;
        label?: string | undefined;
        workspaceId: string;
      };
    }
  | {
      success: false;
      error: string;
    } {
  const raw =
    typeof payload === "object" && payload !== null
      ? {
          folderId:
            typeof (payload as { folderId?: unknown }).folderId === "string"
              ? normalizeExtensionRouteUuidInput(
                  (payload as { folderId: string }).folderId
                )
              : (payload as { folderId?: unknown }).folderId,
          label:
            typeof (payload as { label?: unknown }).label === "string"
              ? (payload as { label: string }).label.trim() || undefined
              : (payload as { label?: unknown }).label,
          workspaceId:
            typeof (payload as { workspaceId?: unknown }).workspaceId ===
            "string"
              ? normalizeExtensionRouteUuidInput(
                  (payload as { workspaceId: string }).workspaceId
                )
              : (payload as { workspaceId?: unknown }).workspaceId,
        }
      : payload;

  const parsed = extensionDestinationPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: EXTENSION_INVALID_PAYLOAD_ERROR,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function resolveExtensionWorkspaceFolderParentId(input: {
  parentId: string | null | undefined;
  rootFolderId: string;
}) {
  const normalized =
    typeof input.parentId === "string"
      ? normalizeExtensionRouteUuidInput(input.parentId)
      : "";

  return normalized || input.rootFolderId;
}

export function serializeExtensionDestination(input: {
  createdAt: Date;
  folderId: string;
  folderName: string;
  id: string;
  label: string;
  organizationId: string;
  updatedAt: Date;
  workspaceId: string;
  workspaceName: string;
}) {
  return {
    ...input,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

export function resolveExtensionRouteError(
  error: unknown,
  input: {
    fallback: string;
    status?: number;
  }
) {
  return {
    error: error instanceof Error ? error.message : input.fallback,
    status: input.status ?? 400,
  };
}
