import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveFlashcardSetCard,
  deleteFlashcardSetRecord,
  loadFlashcardReviewSession,
  loadFlashcardSetRecord,
  saveFlashcardSetCard,
  submitFlashcardCardReview,
  toggleFlashcardSetEnrollment,
  updateFlashcardSetMetadata,
} from "@/components/flashcards/flashcard-set-detail-client";

const validSetId = "c729fdf9-945d-46bf-927b-a86b8ee90a07";
const setDetailClientSource = readFileSync(
  resolve(import.meta.dirname, "./flashcard-set-detail-client.ts"),
  "utf8"
);
const setDetailModelSource = readFileSync(
  resolve(import.meta.dirname, "./flashcard-set-detail-model.ts"),
  "utf8"
);

describe("flashcard set detail client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes set/card/enrollment mutations through the expected flashcard endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(loadFlashcardSetRecord(validSetId)).resolves.toBeNull();
    await expect(
      updateFlashcardSetMetadata({
        description: "Entropy and spontaneity",
        setId: validSetId,
        title: "Thermodynamics",
      })
    ).resolves.toBe(true);
    await expect(deleteFlashcardSetRecord(validSetId)).resolves.toBe(true);
    await expect(
      saveFlashcardSetCard({
        backMarkdown: "Back",
        concept: "Entropy",
        frontMarkdown: "Front",
        notesMarkdown: "Notes",
        setId: validSetId,
        subject: "Chemistry",
        tags: ["exam-2"],
        topic: "Thermodynamics",
      })
    ).resolves.toBe(true);
    await expect(archiveFlashcardSetCard("card-1")).resolves.toBe(true);
    await expect(
      toggleFlashcardSetEnrollment({
        newCardsPerDay: 30,
        setId: validSetId,
        status: "active",
      })
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/flashcards/sets/${validSetId}`,
      expect.objectContaining({
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/flashcards/sets/${validSetId}`,
      expect.objectContaining({
        body: JSON.stringify({
          description: "Entropy and spontaneity",
          title: "Thermodynamics",
        }),
        method: "PATCH",
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/flashcards/sets/${validSetId}/cards`,
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/flashcards/cards/card-1",
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/flashcards/sets/${validSetId}/enrollment`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("fails closed for invalid deep-link set ids without firing a fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      loadFlashcardSetRecord("intro-to-computers")
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads review queues and submits ratings through the review endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            queue: [
              {
                card: {
                  backMarkdown: "Back",
                  frontMarkdown: "Front",
                  id: "card-1",
                  source: {},
                  tags: [],
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(
      loadFlashcardReviewSession({
        drillFilters: [
          {
            concept: "Entropy",
            subject: "Chemistry",
            topic: "Thermodynamics",
          },
        ],
        setId: "set-1",
      })
    ).resolves.toHaveLength(1);

    await expect(
      submitFlashcardCardReview({
        cardId: "card-1",
        rating: "good",
      })
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/flashcards/review/queue?"),
      expect.objectContaining({
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/flashcards/review",
      expect.objectContaining({
        body: JSON.stringify({
          cardId: "card-1",
          rating: "good",
        }),
        method: "POST",
      })
    );
  });

  it("preserves safe api error text for review-queue and review-submit failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "review queue offline" }), {
          status: 503,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "review submit offline" }), {
          status: 503,
        })
      );

    await expect(
      loadFlashcardReviewSession({
        drillFilters: [],
        setId: "set-1",
      })
    ).rejects.toThrow("review queue offline");

    await expect(
      submitFlashcardCardReview({
        cardId: "card-1",
        rating: "good",
      })
    ).rejects.toThrow("review submit offline");
  });

  it("keeps detail api transport in the client module while drill-query and enrollment labels stay in the pure model", () => {
    expect(setDetailClientSource).toContain(
      'from "@/components/flashcards/flashcard-set-detail-model"'
    );
    expect(setDetailClientSource).toContain("fetch(`/api/flashcards/sets/${");
    expect(setDetailClientSource).toContain("/api/flashcards/review");
    expect(setDetailClientSource).toContain("/api/flashcards/review/queue?");
    expect(setDetailClientSource).not.toContain("useState(");
    expect(setDetailClientSource).not.toContain("useEffect(");
    expect(setDetailClientSource).not.toContain("HeaderTitle");

    expect(setDetailModelSource).toContain(
      "export function buildFlashcardDrillQuery"
    );
    expect(setDetailModelSource).toContain(
      "export function getFlashcardEnrollmentLabel"
    );
    expect(setDetailModelSource).not.toContain("fetch(");
    expect(setDetailModelSource).not.toContain("useState(");
  });
});
