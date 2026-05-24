import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/badge", () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

import { FlashcardsDashboardMisconceptionDialog } from "@/components/flashcards/flashcards-dashboard-misconception-dialog";

describe("FlashcardsDashboardMisconceptionDialog", () => {
  it("renders misconception blocks and control actions when a misconception is selected", () => {
    const html = renderToStaticMarkup(
      <FlashcardsDashboardMisconceptionDialog
        misconception={{
          active: true,
          blocks: {
            correctedMentalModel:
              "Impulse measures change in momentum, not just force in isolation.",
            explanation:
              "You need momentum conservation context to reason about collisions cleanly.",
            summary:
              "Impulse was being confused with force over time without the momentum model.",
          },
          confidence: 0.82,
          concept: "Impulse",
          createdAt: "2026-05-20T10:00:00.000Z",
          decayedAt: null,
          evidenceClass: "tool",
          evidenceCount: 1,
          evidenceRootId: null,
          evidenceSpan: null,
          firstSeenAt: "2026-05-20T10:00:00.000Z",
          id: "m-1",
          lastSeenAt: "2026-05-20T10:00:00.000Z",
          promotedAt: null,
          reason:
            "Treating impulse as force over time without using the momentum model.",
          resolvedAt: null,
          source: "chat",
          sourceSessionId: null,
          status: "confirmed",
          subject: "Physics",
          topic: "Collisions",
          updatedAt: "2026-05-20T10:00:00.000Z",
          userId: "user-1",
          workspaceId: "workspace-1",
        }}
        onAdjustConfidence={() => {}}
        onClear={() => {}}
        onClose={() => {}}
        onOpenFlashcards={() => {}}
        onOpenTutor={() => {}}
      />
    );

    expect(html).toContain("Misconception summary");
    expect(html).toContain("Corrected mental model");
    expect(html).toContain("Short explanation");
    expect(html).toContain("Concept confidence");
    expect(html).toContain("Method with Apollo");
    expect(html).toContain("Generate Mindset Set");
    expect(html).toContain("Clear misconception");
    expect(html).toContain(
      "Impulse was being confused with force over time without the momentum model."
    );
  });
});
