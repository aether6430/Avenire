import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { importNotionPages } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";
import { notionImportRequestSchema } from "../../import-route-contracts";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, notionImportRequestSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await importNotionPages({
      pageIds: [...parsed.data.pageIds],
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
      { status: 400 }
    );
  }
}
