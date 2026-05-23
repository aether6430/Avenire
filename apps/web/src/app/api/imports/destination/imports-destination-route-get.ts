import { NextResponse } from "next/server";
import { getDataImportOverview } from "@/lib/imports";
import { resolveImportsRouteError } from "../imports-route-model";

export async function handleImportsDestinationGet(input: { userId: string }) {
  try {
    const overview = await getDataImportOverview(input.userId);
    return NextResponse.json({ destination: overview.destination });
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
