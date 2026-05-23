import type { Metadata } from "next";
import { FlashcardSetPageClient } from "@/components/flashcards/set-detail-page";
import { getFlashcardSetForUser } from "@/lib/flashcards";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getWorkspaceRouteContext } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ setId: string }>;
}): Promise<Metadata> {
  try {
    const { setId } = await params;
    const context = await getWorkspaceRouteContext();

    if (!(context.session?.user && context.workspace?.workspaceId)) {
      return buildPageMetadata({
        noIndex: true,
        title: "Mindset Set",
      });
    }

    const set = await getFlashcardSetForUser(
      context.session.user.id,
      context.workspace.workspaceId,
      setId
    );

    return buildPageMetadata({
      noIndex: true,
      title: set?.title ?? "Mindset Set not found.",
    });
  } catch {
    return buildPageMetadata({
      noIndex: true,
      title: "Mindset Set",
    });
  }
}

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
