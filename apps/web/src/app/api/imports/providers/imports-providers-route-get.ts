import { NextResponse } from "next/server";
import { getDataImportOverview } from "@/lib/imports";
import { resolveImportsRouteError } from "../imports-route-model";

export async function handleImportsProvidersGet(input: { userId: string }) {
  try {
    const overview = await getDataImportOverview(input.userId);
    return NextResponse.json(overview);
  } catch (error) {
    const failure = resolveImportsRouteError(error, {
      fallback: "Unable to load import settings.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
