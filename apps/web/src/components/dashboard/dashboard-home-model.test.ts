import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDashboardDrillQuery,
  buildMisconceptionFlashcardPrompt,
  buildMisconceptionTutorPrompt,
  formatDashboardRelativeTime,
  getDashboardActivityStateMessage,
  groupDashboardWeakPoints,
  resolveDashboardActivityErrorMessage,
} from "@/components/dashboard/dashboard-home-model";

describe("dashboard home model", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("serializes drill concepts into repeatable query params", () => {
    const query = buildDashboardDrillQuery([
      {
        concept: "Entropy",
        subject: "Chemistry",
        topic: "Thermodynamics",
      },
      {
        concept: "Enthalpy",
        subject: "Chemistry",
        topic: "Thermodynamics",
      },
    ]);

    const params = new URLSearchParams(query);
    expect(params.getAll("drill")).toHaveLength(2);
    expect(params.getAll("drill")[0]).toContain('"Entropy"');
    expect(params.getAll("drill")[1]).toContain('"Enthalpy"');
  });

  it("formats relative activity labels for recent and older events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T12:00:00.000Z"));

    expect(formatDashboardRelativeTime("2026-05-13T11:59:45.000Z")).toBe(
      "just now"
    );
    expect(formatDashboardRelativeTime("2026-05-13T11:15:00.000Z")).toBe(
      "45m ago"
    );
    expect(formatDashboardRelativeTime("2026-05-13T08:00:00.000Z")).toBe(
      "4h ago"
    );
    expect(formatDashboardRelativeTime("2026-05-10T12:00:00.000Z")).toBe(
      "3d ago"
    );
  });

  it("groups weak points by subject/topic, counts active misconceptions, and builds tutor prompts", () => {
    const groups = groupDashboardWeakPoints(
      [
        {
          concept: "Entropy",
          score: 0.22,
          subject: "Chemistry",
          topic: "Thermodynamics",
        },
        {
          concept: "Enthalpy",
          score: 0.35,
          subject: "Chemistry",
          topic: "Thermodynamics",
        },
        {
          concept: "Electrons",
          score: 0.41,
          subject: "Physics",
          topic: "Circuits",
        },
      ] as never[],
      [
        {
          active: true,
          concept: "Entropy",
          confidence: 0.62,
          id: "mis-1",
          reason: "Mixed it up with enthalpy.",
          source: "chat",
          subject: "Chemistry",
          topic: "Thermodynamics",
        },
        {
          active: false,
          concept: "Entropy",
          confidence: 0.51,
          id: "mis-2",
          reason: "Old resolved misconception.",
          source: "chat",
          subject: "Chemistry",
          topic: "Thermodynamics",
        },
      ] as never[]
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.subject).toBe("Chemistry");
    expect(groups[0]?.topic).toBe("Thermodynamics");
    expect(groups[0]?.misconceptionCount).toBe(1);
    expect(groups[0]?.concepts.map((concept) => concept.concept)).toEqual([
      "Entropy",
      "Enthalpy",
    ]);

    const misconception = {
      active: true,
      concept: "Entropy",
      confidence: 0.62,
      id: "mis-1",
      reason: "Mixed it up with enthalpy.",
      source: "chat",
      subject: "Chemistry",
      topic: "Thermodynamics",
    } as never;

    expect(
      decodeURIComponent(buildMisconceptionTutorPrompt(misconception))
    ).toContain("Help me fix this misconception.");
    expect(
      decodeURIComponent(buildMisconceptionFlashcardPrompt(misconception))
    ).toContain("Generate a Mindset Set from this misconception");
  });

  it("keeps dashboard activity loading, failure, and empty states distinct", () => {
    expect(
      getDashboardActivityStateMessage({
        activityCount: 0,
        loadFailed: false,
        loading: true,
      })
    ).toEqual({
      message: "Loading activity...",
      showSpinner: true,
    });

    expect(
      getDashboardActivityStateMessage({
        activityCount: 0,
        errorMessage: "activity backend offline",
        loadFailed: true,
        loading: false,
      })
    ).toEqual({
      message: "activity backend offline",
      showSpinner: false,
    });

    expect(
      getDashboardActivityStateMessage({
        activityCount: 0,
        loadFailed: false,
        loading: false,
      })
    ).toEqual({
      message: "No recent activity.",
      showSpinner: false,
    });

    expect(
      getDashboardActivityStateMessage({
        activityCount: 2,
        loadFailed: false,
        loading: false,
      })
    ).toBeNull();
  });

  it("keeps dashboard activity errors readable", () => {
    expect(
      resolveDashboardActivityErrorMessage(
        new Error("activity backend offline")
      )
    ).toBe("activity backend offline");
    expect(resolveDashboardActivityErrorMessage(null)).toBe(
      "Unable to load activity."
    );
  });
});
