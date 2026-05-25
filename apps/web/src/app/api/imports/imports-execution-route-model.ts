import { z } from "zod";

const googleDriveImportRoutePayloadSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(50),
});

const notionImportRoutePayloadSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1).max(50),
});

export const IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR = "Invalid payload";
export const IMPORT_EXECUTION_PROVIDER_UNAVAILABLE_STATUS = 409;
export const IMPORT_EXECUTION_RUNTIME_ERROR_STATUS = 500;

function normalizeImportExecutionIds(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) =>
    typeof entry === "string" ? entry.trim() : entry
  );
}

export function parseGoogleDriveImportRoutePayload(payload: unknown):
  | {
      success: true;
      data: {
        fileIds: string[];
      };
    }
  | {
      success: false;
      error: string;
    } {
  const raw =
    typeof payload === "object" && payload !== null
      ? {
          ...payload,
          fileIds: normalizeImportExecutionIds(
            (payload as { fileIds?: unknown } | null | undefined)?.fileIds
          ),
        }
      : payload;

  const parsed = googleDriveImportRoutePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function parseNotionImportRoutePayload(payload: unknown):
  | {
      success: true;
      data: {
        pageIds: string[];
      };
    }
  | {
      success: false;
      error: string;
    } {
  const raw =
    typeof payload === "object" && payload !== null
      ? {
          ...payload,
          pageIds: normalizeImportExecutionIds(
            (payload as { pageIds?: unknown } | null | undefined)?.pageIds
          ),
        }
      : payload;

  const parsed = notionImportRoutePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function resolveImportExecutionRouteError(
  error: unknown,
  input: {
    fallback: string;
    status?: number;
  }
) {
  const errorMessage = error instanceof Error ? error.message : input.fallback;
  const normalized = errorMessage.trim().toLowerCase();
  const isProviderReadinessError =
    normalized.includes("import is not configured.") ||
    normalized.includes("account is not connected.") ||
    normalized.includes("account must be reconnected.") ||
    normalized.includes("missing drive import scopes.") ||
    normalized.includes("unable to get a valid google access token.") ||
    normalized.includes("unable to get a valid notion access token.");

  return {
    error: errorMessage,
    status:
      input.status ??
      (isProviderReadinessError
        ? IMPORT_EXECUTION_PROVIDER_UNAVAILABLE_STATUS
        : IMPORT_EXECUTION_RUNTIME_ERROR_STATUS),
  };
}
