import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import {
  INGESTION_JOB_LOAD_ERROR,
  resolveIngestionJobsRouteError,
} from "../ingestion-jobs-route-model";
import { handleIngestionJobRouteGet } from "./ingestion-job-route-get";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleIngestionJobRouteGet({
      request,
      userId: user.id,
      params: context.params,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveIngestionJobsRouteError(error, INGESTION_JOB_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
