import { listWaitlistEntries } from "@avenire/database";
import { NextResponse } from "next/server";
import { resolveMaintenanceRouteError } from "../maintenance-route-model";

export async function handleMaintenanceWaitlistRouteGet() {
  try {
    const waitlist = await listWaitlistEntries({
      status: ["pending", "approved"],
      limit: 200,
    });

    return NextResponse.json({ ok: true, waitlist });
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to list waitlist entries.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
