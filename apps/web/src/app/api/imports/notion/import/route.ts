import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveImportExecutionRouteError } from "../../imports-execution-route-model";
import { handleNotionImportRoutePost } from "./imports-notion-import-route-post";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleNotionImportRoutePost({
      request,
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveImportExecutionRouteError(error, {
      fallback: "Unable to import Notion pages.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
