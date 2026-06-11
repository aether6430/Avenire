import { describe, expect, it } from "vitest";
import { applyNewCardDailyLimitToQueue } from "./flashcard-queue";

interface QueueItem {
  id: string;
  newCardsPerDay: number;
  reviewState: "due" | null;
  setId: string;
}

const filterQueue = (
  items: QueueItem[],
  introducedNewTodayBySet = new Map<string, number>()
) =>
  applyNewCardDailyLimitToQueue({
    getNewCardsPerDay: (item) => item.newCardsPerDay,
    getSetId: (item) => item.setId,
    introducedNewTodayBySet,
    isNew: (item) => item.reviewState === null,
    items,
  }).map((item) => item.id);

describe("applyNewCardDailyLimitToQueue", () => {
  it("hides new cards once today's first-review cap is exhausted", () => {
    const items: QueueItem[] = [
      { id: "new-1", newCardsPerDay: 1, reviewState: null, setId: "set-1" },
      { id: "new-2", newCardsPerDay: 1, reviewState: null, setId: "set-1" },
    ];

    expect(filterQueue(items, new Map([["set-1", 1]]))).toEqual([]);
  });

  it("keeps due reviewed cards when new-card cap is exhausted", () => {
    const items: QueueItem[] = [
      { id: "due-1", newCardsPerDay: 1, reviewState: "due", setId: "set-1" },
      { id: "new-1", newCardsPerDay: 1, reviewState: null, setId: "set-1" },
    ];

    expect(filterQueue(items, new Map([["set-1", 1]]))).toEqual(["due-1"]);
  });

  it("subtracts introduced cards from the visible new-card allowance", () => {
    const items: QueueItem[] = [
      { id: "new-1", newCardsPerDay: 3, reviewState: null, setId: "set-1" },
      { id: "new-2", newCardsPerDay: 3, reviewState: null, setId: "set-1" },
      { id: "new-3", newCardsPerDay: 3, reviewState: null, setId: "set-1" },
    ];

    expect(filterQueue(items, new Map([["set-1", 1]]))).toEqual([
      "new-1",
      "new-2",
    ]);
  });

  it("tracks limits per set instead of globally", () => {
    const items: QueueItem[] = [
      {
        id: "set-1-new-1",
        newCardsPerDay: 2,
        reviewState: null,
        setId: "set-1",
      },
      {
        id: "set-1-new-2",
        newCardsPerDay: 2,
        reviewState: null,
        setId: "set-1",
      },
      {
        id: "set-2-new-1",
        newCardsPerDay: 1,
        reviewState: null,
        setId: "set-2",
      },
      {
        id: "set-2-new-2",
        newCardsPerDay: 1,
        reviewState: null,
        setId: "set-2",
      },
    ];

    expect(
      filterQueue(
        items,
        new Map([
          ["set-1", 1],
          ["set-2", 0],
        ])
      )
    ).toEqual(["set-1-new-1", "set-2-new-1"]);
  });
});
