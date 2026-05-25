import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveImportExecutionRouteError } from "../../imports-execution-route-model";
import { handleNotionPagesRouteGet } from "./imports-notion-pages-route-get";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleNotionPagesRouteGet({
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveImportExecutionRouteError(error, {
      fallback: "Unable to load Notion pages.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
