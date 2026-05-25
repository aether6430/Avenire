import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveImportsRouteError } from "../../imports-route-model";
import { handleImportsDestinationFoldersGet } from "./imports-destination-folders-route-get";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleImportsDestinationFoldersGet({
      request,
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to load folders.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
