import { handleRealtimeFilesRouteGet } from "./realtime-files-route-get";
import { resolveRealtimeFilesRouteError } from "./realtime-files-route-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await handleRealtimeFilesRouteGet(request);
  } catch (error) {
    return Response.json(
      {
        error: resolveRealtimeFilesRouteError(error),
      },
      { status: 500 }
    );
  }
}
