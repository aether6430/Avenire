import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleIngestionJobRouteGet } from "./ingestion-job-route-get";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleIngestionJobRouteGet({
    request,
    userId: user.id,
    params: context.params,
  });
}
