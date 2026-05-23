import type { TaskResourceLink } from "@avenire/database/task-data";

export type CaptureKind = "task" | "note" | "misconception";
export const CAPTURE_ROUTE_ERROR = "Unable to capture item.";
export const CAPTURE_TASK_ERROR = "Unable to capture task.";
export const CAPTURE_NOTE_ERROR = "Unable to capture note.";
export const CAPTURE_MISCONCEPTION_ERROR = "Unable to capture misconception.";

export interface CaptureRequestBody {
  assigneeUserId?: unknown;
  concept?: unknown;
  confidence?: unknown;
  content?: unknown;
  description?: unknown;
  dueAt?: unknown;
  kind?: unknown;
  reason?: unknown;
  resources?: unknown;
  subject?: unknown;
  title?: unknown;
  topic?: unknown;
}

export function normalizeCaptureText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveCaptureKind(value: unknown): CaptureKind | null {
  const normalized = normalizeCaptureText(value);
  if (
    normalized === "task" ||
    normalized === "note" ||
    normalized === "misconception"
  ) {
    return normalized;
  }
  return null;
}

export function resolveTaskCapturePayload(
  body: CaptureRequestBody,
  userId: string
) {
  return {
    assigneeUserId:
      typeof body.assigneeUserId === "string" &&
      body.assigneeUserId.trim().length > 0
        ? body.assigneeUserId.trim()
        : userId,
    description:
      typeof body.description === "string"
        ? body.description.trim() || null
        : null,
    dueAt:
      typeof body.dueAt === "string" && body.dueAt.trim().length > 0
        ? new Date(body.dueAt)
        : null,
    resources: resolveTaskCaptureResources(body.resources),
    title: normalizeCaptureText(body.title),
  };
}

export function resolveNoteCapturePayload(body: CaptureRequestBody) {
  return {
    content: normalizeCaptureText(body.content),
    title: normalizeCaptureText(body.title),
  };
}

export function resolveMisconceptionCapturePayload(body: CaptureRequestBody) {
  const confidenceRaw =
    typeof body.confidence === "number"
      ? body.confidence
      : Number(body.confidence);

  return {
    concept: normalizeCaptureText(body.concept),
    confidence:
      Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
        ? confidenceRaw
        : 0.85,
    reason: normalizeCaptureText(body.reason),
    subject: normalizeCaptureText(body.subject),
    topic: normalizeCaptureText(body.topic),
  };
}

function resolveTaskCaptureResources(resources: unknown): TaskResourceLink[] {
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources.filter((resource): resource is TaskResourceLink => {
    if (
      !(resource && typeof resource === "object" && !Array.isArray(resource))
    ) {
      return false;
    }

    const record = resource as Record<string, unknown>;
    return (
      (record.resourceType === "file" ||
        record.resourceType === "folder" ||
        record.resourceType === "chat") &&
      typeof record.href === "string" &&
      typeof record.resourceId === "string" &&
      (typeof record.subtitle === "string" || record.subtitle === null) &&
      typeof record.title === "string"
    );
  });
}

export function resolveCaptureRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
