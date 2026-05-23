import { NextResponse } from "next/server";
import {
  isAuthorizedMaintenanceRequest,
  resolveMaintenanceRouteError,
} from "../../maintenance-route-model";
import { handleMaintenanceRetrievalWarmupRoutePost } from "./maintenance-retrieval-warmup-route-post";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedMaintenanceRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMaintenanceRetrievalWarmupRoutePost({
      request,
    });
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to warm retrieval cache.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
