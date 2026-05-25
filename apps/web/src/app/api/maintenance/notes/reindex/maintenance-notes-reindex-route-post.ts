import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import {
  acquireMaintenanceLock,
  listNotesNeedingReindex,
  releaseMaintenanceLock,
} from "@/lib/file-data";
import { resolveMaintenanceRouteError } from "../../maintenance-route-model";

const LOCK_NAME = "notes.reindex";
const LOCK_TTL_MS = 10 * 60 * 1000;
const BATCH_LIMIT = 100;

export async function handleMaintenanceNotesReindexRoutePost() {
  const acquired = await acquireMaintenanceLock({
    name: LOCK_NAME,
    ttlMs: LOCK_TTL_MS,
  });
  if (!acquired) {
    return NextResponse.json({ ok: false, skipped: true });
  }

  try {
    const staleNotes = await listNotesNeedingReindex({ limit: BATCH_LIMIT });
    let enqueued = 0;

    for (const note of staleNotes) {
      await scheduleIngestionJob({
        workspaceId: note.workspaceId,
        fileId: note.fileId,
        sourceType: "markdown",
      });
      enqueued += 1;
    }

    return NextResponse.json({
      ok: true,
      found: staleNotes.length,
      enqueued,
    });
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to enqueue note reindex jobs.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  } finally {
    await releaseMaintenanceLock(LOCK_NAME);
  }
}
