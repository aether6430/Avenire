import { getSessionUser } from "@/lib/workspace";
import { handleRealtimeEventsRouteGet } from "./realtime-events-route-get";
import {
  REALTIME_EVENTS_ROUTE_ERROR,
  resolveRealtimeEventsRouteError,
} from "./realtime-events-route-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    return await handleRealtimeEventsRouteGet({
      request,
      userId: user.id,
    });
  } catch (error) {
    return new Response(
      resolveRealtimeEventsRouteError(error, REALTIME_EVENTS_ROUTE_ERROR),
      { status: 500 }
    );
  }
}
