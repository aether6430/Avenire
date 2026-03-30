import type { Route } from "next";
import { redirect } from "next/navigation";
import { FlashcardSetDetail } from "@/components/flashcards/set-detail";
import {
  type FlashcardTaxonomy,
  getFlashcardSetForUser,
} from "@/lib/flashcards";
import { buildPageMetadata } from "@/lib/page-metadata";
import { requireWorkspaceRouteContext } from "@/lib/workspace-route-context";

export const metadata = buildPageMetadata({
  title: "Mindset",
});

function parseDrillFilters(
  rawDrill: string | string[] | undefined
): FlashcardTaxonomy[] {
  let values: string[] = [];

  if (Array.isArray(rawDrill)) {
    values = rawDrill;
  } else if (rawDrill) {
    values = [rawDrill];
  }

  return values.flatMap((value) => {
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

export default async function DashboardFlashcardSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, workspace } = await requireWorkspaceRouteContext(
    "/workspace" as Route
  );

  const { setId } = await params;
  const query = await searchParams;
  const drillFilters = parseDrillFilters(query.drill);
  const autoStudy =
    query.study === "1" ||
    query.study === "true" ||
    query.review === "1" ||
    query.review === "true";

  const set = await getFlashcardSetForUser(
    session.user.id,
    workspace.workspaceId,
    setId
  );

  if (!set) {
    redirect("/workspace/flashcards" as Route);
  }

  return (
    <FlashcardSetDetail
      initialDrillFilters={drillFilters}
      initialSet={set}
      initialStudyOpen={autoStudy}
      key={set.id}
    />
  );
}
