import { NextResponse } from "next/server";
import { importNotionPages, parseNotionImportPayload } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { pageIds: string[] };
  try {
    payload = parseNotionImportPayload(
      await request.json().catch(() => ({})),
    );
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await importNotionPages({
      pageIds: payload.pageIds,
      userId: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import Notion pages.",
      },
      { status: 400 },
    );
  }
}
