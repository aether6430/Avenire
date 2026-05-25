import { NextResponse } from "next/server";
import { listImportDestinationFolders } from "@/lib/imports";
import {
  resolveImportDestinationWorkspaceId,
  resolveImportsRouteError,
} from "../../imports-route-model";

export async function handleImportsDestinationFoldersGet(input: {
  request: Request;
  userId: string;
}) {
  const workspaceId = resolveImportDestinationWorkspaceId(
    new URL(input.request.url).searchParams.get("workspaceId")
  );
  if (!workspaceId.success) {
    return NextResponse.json({ error: workspaceId.error }, { status: 400 });
  }

  try {
    const payload = await listImportDestinationFolders({
      userId: input.userId,
      workspaceId: workspaceId.workspaceId,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to load folders.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
