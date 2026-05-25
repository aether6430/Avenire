import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { getSessionUser } from "@/lib/workspace";
import {
  RETRIEVAL_QUERY_ROUTE_ERROR,
  resolveRetrievalQueryRouteError,
} from "./retrieval-query-route-model";
import { handleRetrievalQueryRoutePost } from "./retrieval-query-route-post";

export async function POST(request: Request) {
  const apiLogger = createApiLogger({
    request,
    route: "/api/ai/retrieval/query",
    feature: "retrieval",
  });

  try {
    await apiLogger.requestStarted();

    const user = await getSessionUser();
    if (!user) {
      await apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleRetrievalQueryRoutePost({
      apiLogger,
      request,
      userId: user.id,
    });
  } catch (error) {
    await apiLogger.requestFailed(500, error);
    return NextResponse.json(
      {
        error: resolveRetrievalQueryRouteError(
          error,
          RETRIEVAL_QUERY_ROUTE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
