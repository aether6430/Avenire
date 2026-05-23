import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFlashcardSet,
  generateFlashcardsOnboardingSet,
} from "@/components/flashcards/flashcards-dashboard-client";

describe("flashcards dashboard client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates onboarding sets through the onboarding endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          set: { id: "set-generated" },
        }),
        { status: 200 }
      )
    );

    await expect(
      generateFlashcardsOnboardingSet({
        concept: "Entropy",
        count: 5,
        reason: "Wrong mental model",
        subject: "Chemistry",
        topic: "Thermodynamics",
      })
    ).resolves.toBe("set-generated");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/flashcards/onboarding",
      expect.objectContaining({
        body: JSON.stringify({
          concept: "Entropy",
          count: 5,
          reason: "Wrong mental model",
          subject: "Chemistry",
          topic: "Thermodynamics",
        }),
        method: "POST",
      })
    );
  });

  it("returns a product-facing generation error when the onboarding set cannot be opened", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ set: {} }), { status: 200 })
    );

    await expect(
      generateFlashcardsOnboardingSet({
        concept: "Entropy",
        count: 5,
        reason: "Wrong mental model",
        subject: "Chemistry",
        topic: "Thermodynamics",
      })
    ).rejects.toThrow(
      "Mindset Set generation finished, but it could not be opened automatically."
    );
  });

  it("creates sets through the sets endpoint and returns user-facing status when routing data is missing", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            set: { id: "set-1" },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ set: {} }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "dashboard create offline",
          }),
          { status: 503 }
        )
      );

    await expect(
      createFlashcardSet({
        description: "Feedback and stability",
        tags: ["signals", "controls"],
        title: "Control systems",
      })
    ).resolves.toEqual({
      setId: "set-1",
      status: null,
    });

    await expect(
      createFlashcardSet({
        description: "",
        tags: [],
        title: "Broken response",
      })
    ).resolves.toEqual({
      setId: null,
      status:
        "The Mindset Set was created, but it could not be opened automatically.",
    });

    await expect(
      createFlashcardSet({
        description: "",
        tags: [],
        title: "Offline response",
      })
    ).resolves.toEqual({
      setId: null,
      status: "dashboard create offline",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/flashcards/sets",
      expect.objectContaining({
        body: JSON.stringify({
          description: "Feedback and stability",
          tags: ["signals", "controls"],
          title: "Control systems",
        }),
        method: "POST",
      })
    );
  });
});
