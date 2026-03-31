import type { Metadata } from "next";
import { FlashcardSetPageClient } from "@/components/flashcards/set-detail-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata({
  noIndex: true,
  title: "Mindset",
});

export default async function WorkspaceFlashcardSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ setId }, query] = await Promise.all([params, searchParams]);

  return (
    <FlashcardSetPageClient
      autoStudy={
        query.study === "1" ||
        query.study === "true" ||
        query.review === "1" ||
        query.review === "true"
      }
      drillFilters={query.drill}
      key={setId}
      setId={setId}
    />
  );
}
