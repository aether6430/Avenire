import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleImportsDestinationGet } from "./imports-destination-route-get";
import { handleImportsDestinationPut } from "./imports-destination-route-put";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleImportsDestinationGet({
    userId: user.id,
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleImportsDestinationPut({
    request,
    userId: user.id,
  });
}
