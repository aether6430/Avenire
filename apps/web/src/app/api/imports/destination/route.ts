import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveImportsRouteError } from "../imports-route-model";
import { handleImportsDestinationGet } from "./imports-destination-route-get";
import { handleImportsDestinationPut } from "./imports-destination-route-put";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleImportsDestinationGet({
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to load import destination.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleImportsDestinationPut({
      request,
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to save import destination.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
