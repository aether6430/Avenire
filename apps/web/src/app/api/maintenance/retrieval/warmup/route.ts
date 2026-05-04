import { NextResponse } from "next/server";
import { z } from "zod";
import { warmRetrievalCacheForWorkspace } from "@/lib/retrieval-service";

const warmupSchema = z.object({
  chunkCount: z.number().int().min(0).optional(),
  fileId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  resourceCount: z.number().int().min(0).optional(),
  workspaceId: z.string().uuid(),
});

function isAuthorized(request: Request) {
  const token = process.env.MAINTENANCE_CRON_TOKEN;
  if (!token) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = warmupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await warmRetrievalCacheForWorkspace(parsed.data);
  return NextResponse.json(result);
}
