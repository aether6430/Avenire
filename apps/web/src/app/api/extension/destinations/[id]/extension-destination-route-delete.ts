import { deleteExtensionDestinationPreset } from "@avenire/database";
import { NextResponse } from "next/server";
import { getOwnedExtensionDestinationPreset } from "../../extension-route-context";
import { resolveExtensionRouteError } from "../../extension-route-model";

export async function handleExtensionDestinationRouteDelete(input: {
  params: Promise<{ id: string }>;
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

  try {
    const deleted = await deleteExtensionDestinationPreset({
      presetId: ownedDestination.destination.id,
      userId: input.userId,
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to delete extension destination.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
