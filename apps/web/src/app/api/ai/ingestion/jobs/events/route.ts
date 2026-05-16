import { getSessionUser } from "@/lib/workspace";
import { handleIngestionJobEventsRouteGet } from "./ingestion-job-events-route-get";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return await handleIngestionJobEventsRouteGet({
    request,
    userId: user.id,
  });
}
