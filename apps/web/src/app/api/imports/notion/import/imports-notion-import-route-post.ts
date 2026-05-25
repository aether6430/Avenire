import { NextResponse } from "next/server";
import { importNotionPages } from "@/lib/imports";
import {
  parseNotionImportRoutePayload,
  resolveImportExecutionRouteError,
} from "../../imports-execution-route-model";

export async function handleNotionImportRoutePost(input: {
  request: Request;
  userId: string;
}) {
  const parsed = parseNotionImportRoutePayload(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await importNotionPages({
      pageIds: parsed.data.pageIds,
      userId: input.userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = resolveImportExecutionRouteError(error, {
      fallback: "Unable to import Notion pages.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
