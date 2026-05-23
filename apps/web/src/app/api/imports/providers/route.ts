import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveImportsRouteError } from "../imports-route-model";
import { handleImportsProvidersGet } from "./imports-providers-route-get";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleImportsProvidersGet({
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to load import settings.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
