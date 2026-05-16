import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleImportsDestinationFoldersGet } from "./imports-destination-folders-route-get";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleImportsDestinationFoldersGet({
    request,
    userId: user.id,
  });
}
