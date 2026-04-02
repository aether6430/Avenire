import { NextResponse } from "next/server";
import { getDataImportOverview } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await getDataImportOverview(user.id);
  return NextResponse.json(overview);
}
