import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveRealtimeFilesTokenRouteError } from "./realtime-files-token-route-model";
import { handleRealtimeFilesTokenRoutePost } from "./realtime-files-token-route-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleRealtimeFilesTokenRoutePost({
      request,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveRealtimeFilesTokenRouteError(error),
      },
      { status: 500 }
    );
  }
}
