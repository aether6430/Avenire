import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { createApiLogger } from "@/lib/observability";
import { retrievalQueryRequestSchema } from "@/lib/retrieval-http-contract";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export async function POST(request: Request) {
  const apiLogger = createApiLogger({
    request,
    route: "/api/ai/retrieval/query",
    feature: "retrieval",
  });

  try {
    await apiLogger.requestStarted();

    const user = await getSessionUser();
    if (!user) {
      await apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonRequest(request, retrievalQueryRequestSchema);
    if (!parsed.success) {
      await apiLogger.requestFailed(400, "Invalid payload", {
        reason: parsed.reason,
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      parsed.data.workspaceUuid
    );
    if (!canAccess) {
      await apiLogger.requestFailed(403, "Forbidden", {
        workspaceUuid: parsed.data.workspaceUuid,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await retrieveWorkspaceChunksShared({
      limit: parsed.data.limit,
      mode: parsed.data.mode,
      origin: "api",
      provider: parsed.data.provider,
      query: parsed.data.query,
      sourceType: parsed.data.sourceType,
      userId: user.id,
      workspaceId: parsed.data.workspaceUuid,
    });
    await apiLogger.requestSucceeded(200, {
      workspaceUuid: parsed.data.workspaceUuid,
      cache: result.cache,
      latencyMs: result.latencyMs,
      resultCount: result.results.length,
    });
    return NextResponse.json(result, {
      headers: { "x-rag-cache": result.cache },
    });
  } catch (error) {
    await apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Failed to query retrieval index" },
      { status: 500 }
    );
  }
}
