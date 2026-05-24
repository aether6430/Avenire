import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FlashcardSetDetailCardBank } from "@/components/flashcards/flashcard-set-detail-card-bank";

const source = readFileSync(
  resolve(import.meta.dirname, "./flashcard-set-detail-card-bank.tsx"),
  "utf8"
);

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

  it("keeps a dedicated stacked mobile layout instead of forcing the desktop table into a narrow viewport", () => {
    expect(source).toContain("sm:hidden");
    expect(source).toContain("hidden sm:block");
    expect(source).toContain("MobileCardBankRow");
  });
});
