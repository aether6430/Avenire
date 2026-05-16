import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { getSessionUser } from "@/lib/workspace";
import { handleRetrievalQueryRoutePost } from "./retrieval-query-route-post";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const apiLogger = createApiLogger({
    request,
    route: "/api/ai/retrieval/query",
    feature: "retrieval",
    userId: user?.id ?? null,
  });
  apiLogger.requestStarted();

  try {
    if (!user) {
      apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleRetrievalQueryRoutePost({
      apiLogger,
      request,
      userId: user.id,
    });
  } catch (error) {
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Failed to query retrieval index" },
      { status: 500 }
    );
  }
}
