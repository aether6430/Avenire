import { NextResponse } from "next/server";
import { listImportableNotionPages } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pages = await listImportableNotionPages(user.id);
    return NextResponse.json({ pages });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Notion pages.",
      },
      { status: 400 },
    );
  }
}
