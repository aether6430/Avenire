import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageGeneratedArtifacts } from "@/components/chat/message-generated-artifacts";

const toolPartSurfaceFile = resolve(
  import.meta.dirname,
  "./tool-part-surface.tsx"
);
const rollingToolMutationBlockFile = resolve(
  import.meta.dirname,
  "./rolling-tool-activity-mutation-block.tsx"
);

describe("message generated artifacts", () => {
  it("uses the user-facing mindset set wording for generated study decks", () => {
    const toolPartSurfaceSource = readFileSync(toolPartSurfaceFile, "utf8");
    const rollingToolMutationBlockSource = readFileSync(
      rollingToolMutationBlockFile,
      "utf8"
    );
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

    expect(html).toContain("Open Mindset Set");
    expect(html).not.toContain("Open flashcards");
    expect(toolPartSurfaceSource).toContain("Open Mindset Set");
    expect(toolPartSurfaceSource).toContain(
      'description="Generating a Mindset Set from the current context."'
    );
    expect(toolPartSurfaceSource).not.toContain("open mindset set");
    expect(toolPartSurfaceSource).not.toContain(
      'description="Generating a mindset set from the current context."'
    );
    expect(rollingToolMutationBlockSource).toContain('"Mindset Set"');
    expect(rollingToolMutationBlockSource).not.toContain('"mindset set"');
  });
});
