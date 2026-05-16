import { listExtensionDestinationPresets } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  resolveExtensionRouteError,
  serializeExtensionDestination,
} from "../extension-route-model";

export async function handleExtensionDestinationsRouteGet(input: {
  userId: string;
}) {
  try {
    const presets = await listExtensionDestinationPresets(input.userId);
    return NextResponse.json({
      destinations: presets.map((preset) =>
        serializeExtensionDestination(preset)
      ),
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to load extension destinations.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
