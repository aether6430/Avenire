import { getSessionUser } from "@/lib/workspace";
import { handleIngestionJobEventsRouteGet } from "./ingestion-job-events-route-get";
import {
  INGESTION_JOB_EVENTS_LOAD_ERROR,
  resolveIngestionJobEventsRouteError,
} from "./ingestion-job-events-route-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    return await handleIngestionJobEventsRouteGet({
      request,
      userId: user.id,
    });
  } catch (error) {
    return new Response(
      resolveIngestionJobEventsRouteError(
        error,
        INGESTION_JOB_EVENTS_LOAD_ERROR
      ),
      { status: 500 }
    );
  }
}
