import { Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { warmRetrievalCacheForWorkspace } from "@/lib/retrieval-service";

const optionalCount = Schema.optional(
  Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))
);
const nullableString = Schema.NullOr(Schema.String);

class RetrievalWarmupRequest extends Schema.Class<RetrievalWarmupRequest>(
  "RetrievalWarmupRequest"
)({
  chunkCount: optionalCount,
  fileId: Schema.optional(nullableString),
  jobId: Schema.optional(nullableString),
  resourceCount: optionalCount,
  workspaceId: Schema.String.check(Schema.isUUID(4)),
}) {}

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

  const parsed = await parseJsonRequest(request, RetrievalWarmupRequest);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await warmRetrievalCacheForWorkspace(parsed.data);
  return NextResponse.json(result);
}
