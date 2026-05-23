import { describe, expect, it } from "vitest";
import {
  filterFlashcardsSidebarSets,
  findFlashcardsSidebarReviewTarget,
  getFlashcardsSidebarSetsState,
} from "@/components/flashcards/flashcards-sidebar-panel-model";

describe("flashcards sidebar panel model", () => {
  it("finds the first set that still needs study pressure", () => {
    expect(
      findFlashcardsSidebarReviewTarget([
        {
          dueCount: 0,
          id: "set-a",
          newCount: 0,
        },
        {
          dueCount: 2,
          id: "set-b",
          newCount: 0,
        },
      ] as never)
    ).toMatchObject({ id: "set-b" });
  });

  it("filters sets by title, description, and tags", () => {
    const filtered = filterFlashcardsSidebarSets(
      [
        {
          description: "Entropy and free energy",
          id: "set-a",
          tags: ["thermo", "exam-2"],
          title: "Thermodynamics",
        },
        {
          description: "Laplace and root locus",
          id: "set-b",
          tags: ["controls"],
          title: "Control systems",
        },
      ] as never,
      "exam-2"
    );

    expect(filtered.map((set) => set.id)).toEqual(["set-a"]);
  });

  it("keeps sidebar set loading, failure, and empty states distinct", () => {
    expect(
      getFlashcardsSidebarSetsState({
        errorMessage: null,
        filteredSetCount: 0,
        loadFailed: false,
        loading: true,
        totalSetCount: 0,
      })
    ).toEqual({
      description: "Mindset Sets are still loading.",
      title: "Loading Mindset Sets...",
    });

    expect(
      getFlashcardsSidebarSetsState({
        errorMessage: "flashcards sidebar offline",
        filteredSetCount: 0,
        loadFailed: true,
        loading: false,
        totalSetCount: 0,
      })
    ).toEqual({
      description: "flashcards sidebar offline",
      title: "Unable to load Mindset Sets.",
    });

    expect(
      getFlashcardsSidebarSetsState({
        errorMessage: null,
        filteredSetCount: 0,
        loadFailed: false,
        loading: false,
        totalSetCount: 0,
      })
    ).toEqual({
      description: "Create a Mindset Set to start studying.",
      title: "No Mindset Sets yet",
    });

    expect(
      getFlashcardsSidebarSetsState({
        errorMessage: null,
        filteredSetCount: 0,
        loadFailed: false,
        loading: false,
        totalSetCount: 3,
      })
    ).toEqual({
      description:
        "Try a shorter search or clear the filters to reveal more Mindset Sets.",
      title: "No matching Mindset Sets",
    });

    expect(
      getFlashcardsSidebarSetsState({
        errorMessage: null,
        filteredSetCount: 2,
        loadFailed: false,
        loading: false,
        totalSetCount: 2,
      })
    ).toBeNull();
  });
});
