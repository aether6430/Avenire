import { Suspense } from "react";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Flashcards",
});

export default function WorkspaceFlashcardsPage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading flashcards..." />}>
      <WorkspaceFlashcardsPageClient />
    </Suspense>
  );
}
