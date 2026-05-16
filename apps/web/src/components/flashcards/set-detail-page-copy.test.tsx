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

describe("FlashcardSetPageClient copy", () => {
  it("uses product-facing recovery copy when the mindset set id is invalid", () => {
    const html = renderToStaticMarkup(
      <FlashcardSetPageClient
        autoStudy={false}
        drillFilters={undefined}
        setId="not-a-valid-set-id"
      />
    );

    expect(html).toContain("Mindset set not found.");
    expect(html).toContain(
      "Try going back to the mindset sets list and opening it again."
    );
    expect(html).not.toContain("opening the set again");
  });
});
