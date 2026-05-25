import { z } from "zod";

const maintenanceWarmupPayloadSchema = z.object({
  chunkCount: z.number().int().min(0).optional(),
  fileId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  resourceCount: z.number().int().min(0).optional(),
  workspaceId: z.string().uuid(),
});

export const MAINTENANCE_INVALID_PAYLOAD_ERROR = "Invalid payload";
export const MAINTENANCE_EMAIL_REQUIRED_ERROR = "Email is required.";

export function isAuthorizedMaintenanceRequest(
  request: Request,
  token = process.env.MAINTENANCE_CRON_TOKEN?.trim() ?? ""
) {
  if (!token) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${token}`;
}

export function parseMaintenanceWarmupPayload(payload: unknown):
  | {
      success: true;
      data: {
        chunkCount?: number | undefined;
        fileId?: string | null | undefined;
        jobId?: string | null | undefined;
        resourceCount?: number | undefined;
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
          ...payload,
          fileId:
            typeof (payload as { fileId?: unknown }).fileId === "string"
              ? (payload as { fileId: string }).fileId.trim()
              : (payload as { fileId?: unknown }).fileId,
          jobId:
            typeof (payload as { jobId?: unknown }).jobId === "string"
              ? (payload as { jobId: string }).jobId.trim()
              : (payload as { jobId?: unknown }).jobId,
          workspaceId:
            typeof (payload as { workspaceId?: unknown }).workspaceId ===
            "string"
              ? (payload as { workspaceId: string }).workspaceId.trim()
              : (payload as { workspaceId?: unknown }).workspaceId,
        }
      : payload;

  const parsed = maintenanceWarmupPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: MAINTENANCE_INVALID_PAYLOAD_ERROR,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function parseMaintenanceWaitlistEmail(payload: unknown):
  | {
      success: true;
      email: string;
    }
  | {
      success: false;
      error: string;
    } {
  const email =
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { email?: unknown }).email === "string"
      ? (payload as { email: string }).email.trim()
      : "";

  if (!email) {
    return {
      success: false,
      error: MAINTENANCE_EMAIL_REQUIRED_ERROR,
    };
  }

  return {
    success: true,
    email,
  };
}

export function resolveMaintenancePublicEmailBaseUrl(baseUrl: string) {
  return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
    ? "https://avenire.space"
    : baseUrl;
}

export function resolveMaintenanceTrashPurgeCutoff(input: {
  now?: Date;
  retentionDays: number;
}) {
  const now = input.now ?? new Date();
  return new Date(now.getTime() - input.retentionDays * 24 * 60 * 60 * 1000);
}

export function resolveMaintenanceRouteError(
  error: unknown,
  input: {
    fallback: string;
    status?: number;
  }
) {
  return {
    error: error instanceof Error ? error.message : input.fallback,
    status: input.status ?? 500,
  };
}
