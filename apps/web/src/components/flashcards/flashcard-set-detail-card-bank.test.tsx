import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FlashcardSetDetailCardBank } from "@/components/flashcards/flashcard-set-detail-card-bank";

describe("FlashcardSetDetailCardBank", () => {
  it("renders card rows inside a real table instead of an icon", () => {
    const html = renderToStaticMarkup(
      <FlashcardSetDetailCardBank
        filteredCards={[
          {
            backMarkdown: "Back answer",
            createdAt: "2026-05-21T08:17:30.891Z",
            frontMarkdown: "Front prompt",
            id: "card-1",
            kind: "flashcard",
            notesMarkdown: "Notes",
            ordinal: 1,
            payload: {},
            setId: "set-1",
            source: {
              concept: "Cache",
              subject: "UX",
              topic: "Backend",
            },
            tags: ["ux"],
            updatedAt: "2026-05-21T08:17:30.891Z",
          },
        ]}
        onArchiveCard={vi.fn()}
        onEditCard={vi.fn()}
        onSearchChange={vi.fn()}
        search=""
        snapshotByCardId={new Map()}
      />
    );

    expect(html).toContain("<table");
    expect(html).toContain("Front prompt");
    expect(html).toContain("Back answer");
    expect(html).toContain("ux");
    expect(html).not.toContain("<svg><thead");
  });
});
