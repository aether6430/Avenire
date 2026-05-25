import { createExtensionDestinationPreset } from "@avenire/database";
import { NextResponse } from "next/server";
import { resolveExtensionDestinationWorkspaceFolderContext } from "../extension-route-context";
import {
  parseExtensionDestinationPayload,
  resolveExtensionRouteError,
  serializeExtensionDestination,
} from "../extension-route-model";

export async function handleExtensionDestinationsRoutePost(input: {
  request: Request;
  userId: string;
}) {
  const parsed = parseExtensionDestinationPayload(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const destinationContext =
    await resolveExtensionDestinationWorkspaceFolderContext({
      folderId: parsed.data.folderId,
      userId: input.userId,
      workspaceId: parsed.data.workspaceId,
    });
  if (!destinationContext.success) {
    return NextResponse.json(
      { error: destinationContext.error },
      { status: destinationContext.status }
    );
  }

  try {
    const preset = await createExtensionDestinationPreset({
      userId: input.userId,
      workspaceId: destinationContext.workspace.workspaceId,
      organizationId: destinationContext.workspace.organizationId,
      folderId: destinationContext.folder.id,
      label: parsed.data.label ?? destinationContext.folder.name,
      workspaceName: destinationContext.workspace.name,
      folderName: destinationContext.folder.name,
    });

    return NextResponse.json(
      {
        destination: serializeExtensionDestination(preset),
      },
      { status: 201 }
    );
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to save extension destination.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
