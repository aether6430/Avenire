import { NextResponse } from "next/server";
import type { FlashcardTaxonomy } from "@/lib/flashcards";
import { listDueFlashcardsForUser } from "@/lib/flashcards";
import { getWorkspaceContextForUser } from "@/lib/workspace";

function parseDrillFilters(searchParams: URLSearchParams): FlashcardTaxonomy[] {
  return searchParams.getAll("drill").flatMap((value) => {
    try {
      const parsed = JSON.parse(value) as Partial<FlashcardTaxonomy>;
      if (
        typeof parsed.subject !== "string" ||
        typeof parsed.topic !== "string" ||
        typeof parsed.concept !== "string"
      ) {
        return [];
      }

      return [
        {
          concept: parsed.concept,
          subject: parsed.subject,
          topic: parsed.topic,
        },
      ];
    } catch {
      return [];
    }
  });
}

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId")?.trim() || undefined;
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const taxonomyFilters = parseDrillFilters(searchParams);

  const queue = await listDueFlashcardsForUser({
    limit: Number.isFinite(limitParam) ? limitParam : 20,
    setId,
    taxonomyFilters: taxonomyFilters.length > 0 ? taxonomyFilters : undefined,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json({ queue });
}
