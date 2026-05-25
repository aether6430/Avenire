import { NextResponse } from "next/server";
import { getGooglePickerToken } from "@/lib/imports";
import { resolveImportExecutionRouteError } from "../../imports-execution-route-model";

export async function handleGoogleDrivePickerTokenRouteGet(input: {
  userId: string;
}) {
  try {
    const token = await getGooglePickerToken(input.userId);
    return NextResponse.json(token);
  } catch (error) {
    const failure = resolveImportExecutionRouteError(error, {
      fallback: "Unable to get a Google Drive access token.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
