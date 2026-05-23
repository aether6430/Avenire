import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFlashcardsSidebarSet,
  loadFlashcardsSidebarSets,
} from "@/components/flashcards/flashcards-sidebar-panel-client";

describe("flashcards sidebar panel client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads sidebar sets and creates sets through the flashcards set endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sets: [{ id: "set-a", title: "Thermodynamics" }],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            set: { id: "set-created" },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            set: {},
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "flashcards sidebar offline",
          }),
          { status: 503 }
        )
      );

    await expect(loadFlashcardsSidebarSets()).resolves.toEqual([
      { id: "set-a", title: "Thermodynamics" },
    ]);

    await expect(
      createFlashcardsSidebarSet({
        description: "Entropy and free energy",
        title: "Thermodynamics",
      })
    ).resolves.toEqual({
      setId: "set-created",
      status: null,
    });

    await expect(
      createFlashcardsSidebarSet({
        description: "",
        title: "Broken response",
      })
    ).resolves.toEqual({
      setId: null,
      status:
        "The Mindset Set was created, but it could not be opened automatically.",
    });

    await expect(loadFlashcardsSidebarSets()).rejects.toThrow(
      "flashcards sidebar offline"
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/flashcards/sets",
      expect.objectContaining({
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/flashcards/sets",
      expect.objectContaining({
        body: JSON.stringify({
          description: "Entropy and free energy",
          title: "Thermodynamics",
        }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/flashcards/sets",
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });
});
