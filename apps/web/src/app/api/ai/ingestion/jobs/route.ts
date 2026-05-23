import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleIngestionJobsRouteGet } from "./ingestion-jobs-route-get";
import {
  INGESTION_JOBS_ENQUEUE_ERROR,
  INGESTION_JOBS_LIST_ERROR,
  resolveIngestionJobsRouteError,
} from "./ingestion-jobs-route-model";
import { handleIngestionJobsRoutePost } from "./ingestion-jobs-route-post";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleIngestionJobsRouteGet({
      request,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveIngestionJobsRouteError(error, INGESTION_JOBS_LIST_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleIngestionJobsRoutePost({
      request,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveIngestionJobsRouteError(
          error,
          INGESTION_JOBS_ENQUEUE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
