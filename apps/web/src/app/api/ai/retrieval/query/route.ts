import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiLogger } from "@/lib/observability";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

const querySchema = z.object({
  workspaceUuid: z.string().uuid(),
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional(),
  mode: z.enum(["auto", "fast", "full"]).optional(),
  sourceType: z
    .enum(["pdf", "image", "video", "audio", "markdown", "link"])
    .optional(),
  provider: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  const apiLogger = createApiLogger({
    request,
    route: "/api/ai/retrieval/query",
    feature: "retrieval",
    userId: user?.id ?? null,
  });
  apiLogger.requestStarted();

  try {
    if (!user) {
      apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = querySchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      apiLogger.requestFailed(400, "Invalid payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      parsed.data.workspaceUuid
    );
    if (!canAccess) {
      apiLogger.requestFailed(403, "Forbidden", {
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
    apiLogger.requestSucceeded(200, {
      workspaceUuid: parsed.data.workspaceUuid,
      cache: result.cache,
      latencyMs: result.latencyMs,
      resultCount: result.results.length,
    });
    return NextResponse.json(result, {
      headers: { "x-rag-cache": result.cache },
    });
  } catch (error) {
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Failed to query retrieval index" },
      { status: 500 }
    );
  }
}
