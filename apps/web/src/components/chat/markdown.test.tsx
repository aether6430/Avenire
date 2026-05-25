import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const messagePartsFile = resolve(import.meta.dirname, "./message-parts.tsx");
const flashcardStudyDialogFile = resolve(
  import.meta.dirname,
  "../flashcards/flashcard-set-detail-study-dialog.tsx"
);
const removedMarkdownWrapperFile = resolve(
  import.meta.dirname,
  "./markdown.tsx"
);

describe("Markdown ownership", () => {
  it("routes live markdown rendering through markdown-surface directly after the wrapper collapse", () => {
    const messagePartsSource = readFileSync(messagePartsFile, "utf8");
    const flashcardStudyDialogSource = readFileSync(
      flashcardStudyDialogFile,
      "utf8"
    );

    expect(messagePartsSource).toContain(
      'import("@/components/chat/markdown-surface")'
    );
    expect(messagePartsSource).not.toContain(
      'import("@/components/chat/markdown")'
    );
    expect(flashcardStudyDialogSource).toContain(
      'from "@/components/chat/markdown-surface"'
    );
    expect(flashcardStudyDialogSource).not.toContain(
      'from "@/components/chat/markdown"'
    );
    expect(existsSync(removedMarkdownWrapperFile)).toBe(false);
  });
});
