import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleIngestionJobsRouteGet } from "./ingestion-jobs-route-get";
import { handleIngestionJobsRoutePost } from "./ingestion-jobs-route-post";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleIngestionJobsRouteGet({
    request,
    userId: user.id,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleIngestionJobsRoutePost({
    request,
    userId: user.id,
  });
}
