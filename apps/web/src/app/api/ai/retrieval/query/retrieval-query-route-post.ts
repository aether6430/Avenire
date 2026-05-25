import { NextResponse } from "next/server";
import type { createApiLogger } from "@/lib/observability";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  buildRetrievalQuerySuccessHeaders,
  parseRetrievalQueryBody,
  RETRIEVAL_QUERY_ROUTE_ERROR,
  resolveRetrievalQueryRouteError,
} from "./retrieval-query-route-model";

export async function handleRetrievalQueryRoutePost(input: {
  apiLogger: ReturnType<typeof createApiLogger>;
  request: Request;
  userId: string;
}) {
  try {
    const parsed = parseRetrievalQueryBody(
      await input.request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      await input.apiLogger.requestFailed(400, "Invalid payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const canAccess = await ensureWorkspaceAccessForUser(
      input.userId,
      parsed.data.workspaceUuid
    );
    if (!canAccess) {
      await input.apiLogger.requestFailed(403, "Forbidden", {
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
      userId: input.userId,
      workspaceId: parsed.data.workspaceUuid,
    });

    await input.apiLogger.requestSucceeded(200, {
      workspaceUuid: parsed.data.workspaceUuid,
      cache: result.cache,
      latencyMs: result.latencyMs,
      resultCount: result.results.length,
    });

    return NextResponse.json(result, {
      headers: buildRetrievalQuerySuccessHeaders(result.cache),
    });
  } catch (error) {
    await input.apiLogger.requestFailed(500, error);
    return NextResponse.json(
      {
        error: resolveRetrievalQueryRouteError(
          error,
          RETRIEVAL_QUERY_ROUTE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
