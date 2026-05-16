import { describe, expect, it } from "vitest";
import {
  buildFlashcardSetTags,
  buildOrderedFlashcardSets,
  findFlashcardsReviewTarget,
  findSelectedFlashcardSet,
  findSelectedFlashcardSnapshots,
  getFlashcardEnrollmentLabel,
} from "@/components/flashcards/flashcards-dashboard-model";

describe("flashcards dashboard model", () => {
  it("orders sets by study pressure and derives review targets and labels", () => {
    const ordered = buildOrderedFlashcardSets({
      cardSnapshots: [],
      sets: [
        {
          cardCount: 20,
          dueCount: 0,
          enrollmentStatus: "paused",
          id: "set-c",
          newCount: 0,
          updatedAt: "2026-05-12T09:00:00.000Z",
        },
        {
          cardCount: 10,
          dueCount: 4,
          enrollmentStatus: "active",
          id: "set-a",
          newCount: 2,
          updatedAt: "2026-05-11T09:00:00.000Z",
        },
        {
          cardCount: 12,
          dueCount: 4,
          enrollmentStatus: null,
          id: "set-b",
          newCount: 2,
          updatedAt: "2026-05-13T09:00:00.000Z",
        },
      ],
    } as never);

    expect(ordered.map((set) => set.id)).toEqual(["set-b", "set-a", "set-c"]);
    expect(findFlashcardsReviewTarget(ordered)?.id).toBe("set-b");
    expect(getFlashcardEnrollmentLabel("active")).toBe("Study active");
    expect(getFlashcardEnrollmentLabel("paused")).toBe("Paused");
    expect(getFlashcardEnrollmentLabel(null)).toBe("Not enrolled");
  });

  it("selects the active set, filters snapshots, and normalizes set tags", () => {
    const orderedSets = [{ id: "set-a" }, { id: "set-b" }] as never[];

    expect(
      findSelectedFlashcardSet({
        orderedSets,
        selectedSetId: "set-b",
      })?.id
    ).toBe("set-b");

    expect(
      findSelectedFlashcardSnapshots({
        dashboard: {
          cardSnapshots: [
            {
              card: { id: "card-1", setId: "set-a" },
            },
            {
              card: { id: "card-2", setId: "set-b" },
            },
          ],
        } as never,
        selectedSetId: "set-b",
      }).map((snapshot) => snapshot.card.id)
    ).toEqual(["card-2"]);

    expect(buildFlashcardSetTags(" signals, controls , , exam-2 ")).toEqual([
      "signals",
      "controls",
      "exam-2",
    ]);
  });
});
