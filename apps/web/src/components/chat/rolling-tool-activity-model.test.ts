import { describe, expect, it } from "vitest";
import {
  buildRollingToolSummary,
  groupRollingToolActions,
  toRollingToolAction,
} from "@/components/chat/rolling-tool-activity-model";
import { isRollingToolPart } from "@/components/chat/rolling-tool-activity-types";

describe("rolling tool activity model", () => {
  it("maps note agent output into a note activity preview", () => {
    const action = toRollingToolAction({
      input: { task: "weekly review" },
      output: {
        notes: [
          {
            contentPreview: "Summary of the week",
            title: "Weekly review",
            workspacePath: "Notes/Weekly review",
          },
        ],
        operation: "created",
      },
      state: "output-available",
      type: "tool-note_agent",
    } as never);

    expect(action).toEqual({
      kind: "notes",
      pending: false,
      preview: {
        noteCount: 1,
        operation: "created",
        title: "Weekly review",
      },
      value: "Notes/Weekly review",
    });
  });

  it("groups adjacent explore actions and summarizes the explored work", () => {
    const groups = groupRollingToolActions([
      {
        kind: "search",
        pending: false,
        value: "synthesis",
      },
      {
        kind: "read",
        pending: false,
        preview: {
          content: "Important excerpt",
          path: "Library/Synthesis.md",
        },
        value: "Library/Synthesis.md",
      },
      {
        kind: "edit",
        path: "Drafts/Plan.md",
        pending: false,
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      items: [
        { label: "Search", value: "synthesis" },
        { label: "Read", value: "Library/Synthesis.md" },
      ],
      type: "explore",
    });
    expect(groups[1]).toMatchObject({
      action: {
        kind: "edit",
        path: "Drafts/Plan.md",
        pending: false,
      },
      type: "mutation",
    });
    expect(
      buildRollingToolSummary(
        (groups[0] as Extract<(typeof groups)[number], { type: "explore" }>)
          .items
      )
    ).toBe("1 read, 1 search");
  });

  it("recognizes rolling tool parts and excludes approval-only tool states", () => {
    expect(
      isRollingToolPart({
        input: { query: "workspace notes" },
        state: "input-available",
        type: "tool-avenire_agent",
      } as never)
    ).toBe(true);

    expect(
      isRollingToolPart({
        input: { query: "workspace notes" },
        state: "approval-requested",
        type: "tool-avenire_agent",
      } as never)
    ).toBe(false);
  });
});
