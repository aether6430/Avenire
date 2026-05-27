import { getStorageUrl } from "@avenire/storage";
import { NextResponse } from "next/server";
import { listWorkspaceFiles, resolveWorkspaceForUser } from "@/lib/file-data";
import {
  FILES_ROUTE_LOAD_ERROR,
  mapWorkspaceFileToServerFile,
  resolveFilesRouteError,
} from "./files-route-model";

export async function handleFilesRouteGet(input: {
  activeOrganizationId: string | null;
  uploadThingToken?: string;
  userId: string;
}) {
  if (!input.uploadThingToken) {
    return NextResponse.json({ files: [] });
  }

  try {
    const workspace = await resolveWorkspaceForUser(
      input.userId,
      input.activeOrganizationId
    );
    if (!workspace) {
      return NextResponse.json({ files: [] }, { status: 404 });
    }

    const files = (await listWorkspaceFiles(workspace.workspaceId)).map(
      mapWorkspaceFileToServerFile
    );

    if (files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const hydrated = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await getStorageUrl(file.key).catch(() => ""),
      }))
    );

    return NextResponse.json({
      files: hydrated
        .filter((file) => file.url.length > 0)
        .sort((a, b) => b.uploadedAt - a.uploadedAt),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFilesRouteError(error, FILES_ROUTE_LOAD_ERROR),
        files: [],
      },
      { status: 500 }
    );
  }
}
