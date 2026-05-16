import { NextResponse } from "next/server";
import { saveDataImportDestination } from "@/lib/imports";
import {
  parseImportDestinationPayload,
  resolveImportsRouteError,
} from "../imports-route-model";

export async function handleImportsDestinationPut(input: {
  request: Request;
  userId: string;
}) {
  const parsed = parseImportDestinationPayload(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const destination = await saveDataImportDestination({
      folderId: parsed.data.folderId,
      userId: input.userId,
      workspaceId: parsed.data.workspaceId,
    });
    return NextResponse.json({ destination });
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to save import destination.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
