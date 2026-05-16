import { NextResponse } from "next/server";
import { warmRetrievalCacheForWorkspace } from "@/lib/retrieval-service";
import {
  parseMaintenanceWarmupPayload,
  resolveMaintenanceRouteError,
} from "../../maintenance-route-model";

export async function handleMaintenanceRetrievalWarmupRoutePost(input: {
  request: Request;
}) {
  const parsed = parseMaintenanceWarmupPayload(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await warmRetrievalCacheForWorkspace(parsed.data);
    return NextResponse.json(result);
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
