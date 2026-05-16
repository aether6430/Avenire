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
        filteredSetCount: 0,
        loadFailed: false,
        loading: true,
        totalSetCount: 0,
      })
    ).toEqual({
      description: "Mindset sets are still loading.",
      title: "Loading mindset sets...",
    });

    expect(
      getFlashcardsSidebarSetsState({
        filteredSetCount: 0,
        loadFailed: true,
        loading: false,
        totalSetCount: 0,
      })
    ).toEqual({
      description: "Try again in a moment to reload your mindset sets.",
      title: "Unable to load mindset sets.",
    });

    expect(
      getFlashcardsSidebarSetsState({
        filteredSetCount: 0,
        loadFailed: false,
        loading: false,
        totalSetCount: 0,
      })
    ).toEqual({
      description: "Create a mindset set to start studying.",
      title: "No mindset sets yet",
    });

    expect(
      getFlashcardsSidebarSetsState({
        filteredSetCount: 0,
        loadFailed: false,
        loading: false,
        totalSetCount: 3,
      })
    ).toEqual({
      description:
        "Try a shorter search or clear the filters to reveal more mindset sets.",
      title: "No matching mindset sets",
    });

    expect(
      getFlashcardsSidebarSetsState({
        filteredSetCount: 2,
        loadFailed: false,
        loading: false,
        totalSetCount: 2,
      })
    ).toBeNull();
  });
});
