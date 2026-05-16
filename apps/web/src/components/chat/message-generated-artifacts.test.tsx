import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageGeneratedArtifacts } from "@/components/chat/message-generated-artifacts";

describe("message generated artifacts", () => {
  it("uses the user-facing mindset set wording for generated study decks", () => {
    const html = renderToStaticMarkup(
      <MessageGeneratedArtifacts
        parts={[
          {
            output: {
              cards: [{ front: "Q", back: "A" }],
              setId: "set-1",
              title: "Control systems",
            },
            state: "output-available",
            type: "tool-generate_flashcards",
          } as never,
        ]}
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain("Open mindset set");
    expect(html).not.toContain("Open flashcards");
  });
});
