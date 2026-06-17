import { describe, expect, it } from "vitest";
import { nudgeSameDayDueDate } from "./flashcard-data";
import { applyFlashcardReview } from "./flashcard-fsrs";

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function sameCalendarDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

// Fixed deterministic timestamp: 2025-01-15T14:00:00Z
const FIXED_NOW = new Date("2025-01-15T14:00:00Z");

describe("flashcard seeding with Rating.Good", () => {
  it("produces a due date in the future when seeded from a new card", () => {
    const result = applyFlashcardReview({
      now: FIXED_NOW,
      rating: "good",
      state: null,
    });

    const dueDate = new Date(result.nextState.dueAt);
    expect(dueDate.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
  });

  it("FSRS short-interval Good review often lands on the same calendar day", () => {
    // Use a morning timestamp to maximise chance of same-day result
    const morning = new Date("2025-01-15T08:00:00Z");
    const result = applyFlashcardReview({
      now: morning,
      rating: "good",
      state: null,
    });
    const dueDate = new Date(result.nextState.dueAt);
    // FSRS with Rating.Good on a new card typically produces a short
    // interval that keeps the due date on the same day.
    expect(sameCalendarDay(dueDate, morning)).toBe(true);
  });
});

describe("nudgeSameDayDueDate", () => {
  it("pushes same-day due date forward by 8-9 hours (≥8h, <10h)", () => {
    // dueDate and now on the same calendar day
    const dueDate = new Date("2025-01-15T10:00:00Z");
    const now = new Date("2025-01-15T14:00:00Z");

    const nudged = nudgeSameDayDueDate(dueDate, now);
    const diffMs = nudged.getTime() - dueDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Offset should be between 8 and 9 hours (8 + random() where random < 1)
    expect(diffHours).toBeGreaterThanOrEqual(8);
    expect(diffHours).toBeLessThan(9);
  });

  it("is a no-op when due date is already on a different calendar day", () => {
    const dueDate = new Date("2025-01-16T10:00:00Z"); // next day
    const now = new Date("2025-01-15T14:00:00Z");

    const nudged = nudgeSameDayDueDate(dueDate, now);
    expect(nudged.getTime()).toBe(dueDate.getTime());
  });

  it("is a no-op when due date is on a previous calendar day", () => {
    const dueDate = new Date("2025-01-14T10:00:00Z"); // yesterday
    const now = new Date("2025-01-15T14:00:00Z");

    const nudged = nudgeSameDayDueDate(dueDate, now);
    expect(nudged.getTime()).toBe(dueDate.getTime());
  });

  it("result is always on the next calendar day when applied to same-day input", () => {
    // Edge case: due date at end of day, nudge pushes into next day
    const dueDate = new Date("2025-01-15T23:30:00Z");
    const now = new Date("2025-01-15T08:00:00Z");

    const nudged = nudgeSameDayDueDate(dueDate, now);
    const nudgedDay = startOfDay(nudged);
    const nowDay = startOfDay(now);
    expect(nudgedDay.getTime()).toBeGreaterThan(nowDay.getTime());
  });
});
