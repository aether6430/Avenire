import { handleRealtimeFilesRouteGet } from "./realtime-files-route-get";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return await handleRealtimeFilesRouteGet(request);
}
