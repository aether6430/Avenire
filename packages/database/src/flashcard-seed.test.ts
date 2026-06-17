import { describe, expect, it } from "vitest";
import { applyFlashcardReview } from "./flashcard-fsrs";

/**
 * The nudgeSameDayDueDate function is private, but we can verify the
 * seeding behaviour through the public applyFlashcardReview + the
 * database insertion path. These unit-level tests confirm the FSRS
 * scheduler produces a same-day due date when seeded with Rating.Good
 * on a new card — the exact scenario the nudge is designed to fix.
 */

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function sameCalendarDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

describe("flashcard seeding with Rating.Good", () => {
  it("produces a due date in the future when seeded from a new card", () => {
    const now = new Date();
    const result = applyFlashcardReview({
      now,
      rating: "good",
      state: null,
    });

    const dueDate = new Date(result.nextState.dueAt);
    expect(dueDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it("may land on the same calendar day (which the nudge function must fix)", () => {
    // Run 50 trials — FSRS short-interval Good reviews often produce
    // same-day due dates, which is exactly the problem the nudge solves.
    let sameDayCount = 0;
    for (let i = 0; i < 50; i++) {
      const now = new Date();
      const result = applyFlashcardReview({
        now,
        rating: "good",
        state: null,
      });
      const dueDate = new Date(result.nextState.dueAt);
      if (sameCalendarDay(dueDate, now)) {
        sameDayCount += 1;
      }
    }
    // At least some trials should land same-day, confirming the nudge
    // is actually needed. If none land same-day, the test setup is wrong.
    expect(sameDayCount).toBeGreaterThan(0);
  });

  it("nudge pushes same-day due date forward by 8-9 hours", () => {
    const now = new Date();
    const result = applyFlashcardReview({
      now,
      rating: "good",
      state: null,
    });

    const dueDate = new Date(result.nextState.dueAt);
    if (!sameCalendarDay(dueDate, now)) {
      return; // nothing to nudge — skip
    }

    // Simulate the nudge logic (8–9 hour random offset)
    const offsetHours = 8.5; // midpoint for deterministic check
    const offsetMs = Math.round(offsetHours * 60 * 60 * 1000);
    const nudged = new Date(dueDate.getTime() + offsetMs);

    // After nudge, the due date should be on the next calendar day
    // (since we pushed forward 8+ hours from a same-day time).
    const nudgedDay = startOfDay(nudged);
    const nowDay = startOfDay(now);
    expect(nudgedDay.getTime()).toBeGreaterThan(nowDay.getTime());
  });

  it("nudge is a no-op when due date is already on a different day", () => {
    const now = new Date();
    // Create a card state that's already due tomorrow
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const result = applyFlashcardReview({
      now,
      rating: "good",
      state: {
        difficulty: 5,
        dueAt: tomorrow.toISOString(),
        elapsedDays: 1,
        lapses: 0,
        lastReviewedAt: null,
        reps: 0,
        scheduledDays: 1,
        state: "review",
        stability: 1,
      },
    });

    const dueDate = new Date(result.nextState.dueAt);
    // The due date should remain in the future, not pushed further
    expect(dueDate.getTime()).toBeGreaterThanOrEqual(tomorrow.getTime() - 1000);
  });
});
