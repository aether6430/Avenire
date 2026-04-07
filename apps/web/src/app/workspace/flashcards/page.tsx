import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Flashcards",
});

export default function WorkspaceFlashcardsPage() {
  return <WorkspaceFlashcardsPageClient />;
}
