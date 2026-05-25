import { deleteStorageFiles } from "@avenire/storage";
import { NextResponse } from "next/server";
import { purgeTrashOlderThan } from "@/lib/file-data";
import {
  resolveMaintenanceRouteError,
  resolveMaintenanceTrashPurgeCutoff,
} from "../../maintenance-route-model";

const RETENTION_DAYS = 30;

export async function handleMaintenanceTrashPurgeRoutePost() {
  try {
    const cutoff = resolveMaintenanceTrashPurgeCutoff({
      retentionDays: RETENTION_DAYS,
    });
    const result = await purgeTrashOlderThan(cutoff);
    const deletableKeys = result.storageKeys.filter(
      (storageKey) => !storageKey.startsWith("virtual:duplicate:")
    );

    const uploadThingToken = process.env.UPLOADTHING_TOKEN?.trim();
    if (uploadThingToken && deletableKeys.length > 0) {
      try {
        await deleteStorageFiles(Array.from(new Set(deletableKeys)));
      } catch {
        // Best-effort physical cleanup.
      }
    }

    return NextResponse.json({
      ok: true,
      retentionDays: RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
      filesPurged: result.fileCount,
      foldersPurged: result.folderCount,
    });
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to purge trash.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
