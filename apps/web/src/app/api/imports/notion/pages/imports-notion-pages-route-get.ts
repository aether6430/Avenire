import { NextResponse } from "next/server";
import { listImportableNotionPages } from "@/lib/imports";
import { resolveImportExecutionRouteError } from "../../imports-execution-route-model";

export async function handleNotionPagesRouteGet(input: { userId: string }) {
  try {
    const pages = await listImportableNotionPages(input.userId);
    return NextResponse.json({ pages });
  } catch (error) {
    const failure = resolveImportExecutionRouteError(error, {
      fallback: "Unable to load Notion pages.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
