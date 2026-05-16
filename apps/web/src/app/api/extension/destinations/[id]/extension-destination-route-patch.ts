import { updateExtensionDestinationPreset } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  getOwnedExtensionDestinationPreset,
  resolveExtensionDestinationWorkspaceFolderContext,
} from "../../extension-route-context";
import {
  parseExtensionDestinationPayload,
  resolveExtensionRouteError,
  serializeExtensionDestination,
} from "../../extension-route-model";

export async function handleExtensionDestinationRoutePatch(input: {
  params: Promise<{ id: string }>;
  request: Request;
  userId: string;
}) {
  const { id } = await input.params;
  const ownedDestination = await getOwnedExtensionDestinationPreset({
    presetId: id,
    userId: input.userId,
  });
  if (!ownedDestination.success) {
    return NextResponse.json(
      { error: ownedDestination.error },
      { status: ownedDestination.status }
    );
  }

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
    const destination = await updateExtensionDestinationPreset({
      presetId: ownedDestination.destination.id,
      userId: input.userId,
      workspaceId: destinationContext.workspace.workspaceId,
      organizationId: destinationContext.workspace.organizationId,
      folderId: destinationContext.folder.id,
      label: parsed.data.label ?? destinationContext.folder.name,
      workspaceName: destinationContext.workspace.name,
      folderName: destinationContext.folder.name,
    });

    if (!destination) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      destination: serializeExtensionDestination(destination),
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to update extension destination.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
