import { z } from "zod";

const importDestinationPayloadSchema = z.object({
  folderId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const IMPORT_DESTINATION_INVALID_PAYLOAD_ERROR = "Invalid payload";
export const IMPORT_DESTINATION_WORKSPACE_REQUIRED_ERROR =
  "workspaceId is required";

export function normalizeImportRouteUuidInput(value: string) {
  return value.trim();
}

export function parseImportDestinationPayload(payload: unknown):
  | {
      success: true;
      data: {
        folderId: string;
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
              ? normalizeImportRouteUuidInput(
                  (payload as { folderId: string }).folderId
                )
              : (payload as { folderId?: unknown }).folderId,
          workspaceId:
            typeof (payload as { workspaceId?: unknown }).workspaceId ===
            "string"
              ? normalizeImportRouteUuidInput(
                  (payload as { workspaceId: string }).workspaceId
                )
              : (payload as { workspaceId?: unknown }).workspaceId,
        }
      : payload;

  const parsed = importDestinationPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: IMPORT_DESTINATION_INVALID_PAYLOAD_ERROR,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function resolveImportDestinationWorkspaceId(
  workspaceId: string | null | undefined
):
  | {
      success: true;
      workspaceId: string;
    }
  | {
      success: false;
      error: string;
    } {
  const normalized =
    typeof workspaceId === "string"
      ? normalizeImportRouteUuidInput(workspaceId)
      : "";
  if (!normalized) {
    return {
      success: false,
      error: IMPORT_DESTINATION_WORKSPACE_REQUIRED_ERROR,
    };
  }

  return {
    success: true,
    workspaceId: normalized,
  };
}

export function resolveImportsRouteError(
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
