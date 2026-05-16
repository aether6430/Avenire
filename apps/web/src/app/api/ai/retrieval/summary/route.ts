import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { buildRetrievalSummaryEvidence } from "./retrieval-summary-evidence";
import { generateRetrievalSummaryResponse } from "./retrieval-summary-generation";
import {
  FALLBACK_SUMMARY,
  resolveRequestedFileIds,
  resolveRetrievalSummaryLimits,
  summaryResponse,
  summarySchema,
} from "./retrieval-summary-model";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const apiLogger = createApiLogger({
    request,
    route: "/api/ai/retrieval/summary",
    feature: "retrieval",
    userId: user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = summarySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    void apiLogger.requestFailed(400, "Invalid payload");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const canAccess = await ensureWorkspaceAccessForUser(
    user.id,
    parsed.data.workspaceUuid
  );
  if (!canAccess) {
    void apiLogger.requestFailed(403, "Forbidden", {
      workspaceUuid: parsed.data.workspaceUuid,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { attachmentLimit, attachmentMaxBytes, fetchTimeoutMs } =
    resolveRetrievalSummaryLimits();
  const matches = parsed.data.matches ?? [];
  const fileIds = resolveRequestedFileIds(parsed.data);

  if (fileIds.length === 0 && matches.length === 0) {
    void apiLogger.requestSucceeded(200, {
      workspaceUuid: parsed.data.workspaceUuid,
      reason: "no-files",
    });
    return summaryResponse(FALLBACK_SUMMARY, parsed.data.stream);
  }

  try {
    const evidence = await buildRetrievalSummaryEvidence({
      attachmentLimit,
      attachmentMaxBytes,
      fetchTimeoutMs,
      fileIds,
      matches,
      workspaceUuid: parsed.data.workspaceUuid,
    });

    if (
      evidence.attachedFiles.length === 0 &&
      evidence.textualEvidence.length === 0
    ) {
      void apiLogger.requestSucceeded(200, {
        workspaceUuid: parsed.data.workspaceUuid,
        reason:
          evidence.attemptedFiles > 0
            ? "attachments-empty"
            : "no-accessible-files",
        attemptedFiles: evidence.attemptedFiles,
      });
      return summaryResponse(FALLBACK_SUMMARY, parsed.data.stream);
    }

    return await generateRetrievalSummaryResponse({
      apiLogger,
      attachedFiles: evidence.attachedFiles,
      fileIds,
      query: parsed.data.query,
      stream: parsed.data.stream,
      textualEvidence: evidence.textualEvidence,
      workspaceUuid: parsed.data.workspaceUuid,
    });
  } catch (error) {
    void apiLogger.warn("retrieval.attachment_summary.fallback", {
      workspaceUuid: parsed.data.workspaceUuid,
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: "Unknown attachment summary error" },
      reason: "attachment-summary-error",
    });
    if (parsed.data.stream) {
      return summaryResponse(FALLBACK_SUMMARY, true);
    }
    return summaryResponse(FALLBACK_SUMMARY, false);
  }
}
