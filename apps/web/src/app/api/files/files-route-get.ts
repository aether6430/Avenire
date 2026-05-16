import { UTApi } from "@avenire/storage";
import { NextResponse } from "next/server";
import { listWorkspaceFiles, resolveWorkspaceForUser } from "@/lib/file-data";
import {
  hydrateUploadThingServerFiles,
  mapWorkspaceFileToServerFile,
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
    const utapi = new UTApi({ token: input.uploadThingToken });
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

    const urlsResponse = await utapi.getFileUrls(files.map((file) => file.key));
    return NextResponse.json({
      files: hydrateUploadThingServerFiles({
        files,
        urls: urlsResponse.data,
      }),
    });
  } catch {
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}
