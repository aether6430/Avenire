import type { z } from "zod";
import { matchesTaxonomyScope } from "@/lib/chat-tools/study-tool-helpers";
import {
  getFlashcardDashboardForUser,
  listDueFlashcardsForUser,
  normalizeFlashcardTaxonomy,
} from "@/lib/flashcards";

const DEFAULT_DUE_CARD_LIMIT = 5;

type DueCardsInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["get_due_cards"]["input"]
>;

interface DueCardsRuntimeContext {
  userId: string;
  workspaceId: string;
}

export async function executeGetDueCards(
  ctx: DueCardsRuntimeContext,
  input: DueCardsInput
) {
  const [dashboard, dueCards] = await Promise.all([
    getFlashcardDashboardForUser(ctx.userId, ctx.workspaceId),
    listDueFlashcardsForUser({
      limit: 100,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    }),
  ]);

  const hasScope = Boolean(input.subject || input.topic || input.concept);
  const matchingCardIds = hasScope
    ? new Set(
        (dashboard?.cardSnapshots ?? [])
          .filter((snapshot) => {
            const taxonomy = normalizeFlashcardTaxonomy(snapshot.card.source);
            return Boolean(
              taxonomy &&
                matchesTaxonomyScope(taxonomy, {
                  concept: input.concept,
                  subject: input.subject,
                  topic: input.topic,
                })
            );
          })
          .map((snapshot) => snapshot.card.id)
      )
    : null;
  const filteredDueCards =
    matchingCardIds && hasScope
      ? dueCards.filter((entry) => matchingCardIds.has(entry.card.id))
      : dueCards;
  const previewDueCards = filteredDueCards.slice(
    0,
    input.limit ?? DEFAULT_DUE_CARD_LIMIT
  );

  return {
    dueCards: previewDueCards.map((entry) => ({
      cardId: entry.card.id,
      dueAt: entry.reviewState?.dueAt ?? null,
      frontMarkdown: entry.card.frontMarkdown,
      kind: entry.card.kind,
      remainingDueCount: entry.remainingDueCount,
      setId: entry.set.id,
      setTitle: entry.set.title,
    })),
    totalDueCount: hasScope
      ? filteredDueCards.length
      : (dashboard?.dueCount ?? 0),
  };
}
