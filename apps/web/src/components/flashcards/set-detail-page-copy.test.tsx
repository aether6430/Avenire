import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/header-portal", () => ({
  HeaderBreadcrumbs: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  HeaderTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { FlashcardSetPageClient } from "@/components/flashcards/set-detail-page";

const setDetailPageSource = readFileSync(
  resolve(import.meta.dirname, "./set-detail-page.tsx"),
  "utf8"
);
const setDetailHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-flashcard-set-detail.tsx"),
  "utf8"
);
const setDetailSurfaceSource = readFileSync(
  resolve(import.meta.dirname, "./flashcard-set-detail-surface.tsx"),
  "utf8"
);
const removedWrapperFile = resolve(import.meta.dirname, "./set-detail.tsx");

describe("FlashcardSetPageClient copy", () => {
  it("uses product-facing recovery copy when the mindset set id is invalid", () => {
    const html = renderToStaticMarkup(
      <FlashcardSetPageClient
        autoStudy={false}
        drillFilters={undefined}
        setId="not-a-valid-set-id"
      />
    );

    expect(html).toContain("Mindset Set not found.");
    expect(html).toContain(
      "Try going back to the Mindset Sets list and opening it again."
    );
    expect(html).not.toContain("opening the set again");
    expect(setDetailPageSource).toContain(
      'from "@/components/flashcards/flashcard-set-detail-surface"'
    );
    expect(setDetailPageSource).toContain(
      'from "@/components/flashcards/use-flashcard-set-detail"'
    );
    expect(setDetailPageSource).not.toContain(
      'from "@/components/flashcards/set-detail"'
    );
    expect(existsSync(removedWrapperFile)).toBe(false);
  });

  it("keeps set-detail ownership split between page gating, runtime hook composition, and presentational surface", () => {
    expect(setDetailPageSource).toContain(
      'from "@/components/flashcards/flashcard-set-detail-surface"'
    );
    expect(setDetailPageSource).toContain(
      'from "@/components/flashcards/use-flashcard-set-detail"'
    );
    expect(setDetailPageSource).toContain("function ReadyFlashcardSetDetail");
    expect(setDetailPageSource).not.toContain(
      'from "@/components/flashcards/set-detail"'
    );
    expect(setDetailPageSource).not.toContain("loadFlashcardReviewSession(");
    expect(setDetailPageSource).not.toContain("submitFlashcardCardReview(");

    expect(setDetailHookSource).toContain(
      'from "@/components/flashcards/flashcard-set-detail-client"'
    );
    expect(setDetailHookSource).toContain(
      'from "@/components/flashcards/use-flashcard-set-detail-editing"'
    );
    expect(setDetailHookSource).toContain(
      'from "@/lib/flashcard-browser-cache"'
    );
    expect(setDetailHookSource).not.toContain("HeaderTitle");
    expect(setDetailHookSource).not.toContain("<FlashcardSetDetailCardBank");

    expect(setDetailSurfaceSource).toContain("FlashcardSetDetailActions");
    expect(setDetailSurfaceSource).toContain("FlashcardSetDetailCardBank");
    expect(setDetailSurfaceSource).toContain("FlashcardSetDetailStudyRuntime");
    expect(setDetailSurfaceSource).not.toContain("loadFlashcardReviewSession(");
    expect(setDetailSurfaceSource).not.toContain("submitFlashcardCardReview(");
  });
});
