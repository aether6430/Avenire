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
  const concept = input.concept?.trim() || undefined;
  const subject = input.subject?.trim() || undefined;
  const topic = input.topic?.trim() || undefined;
  const hasScope = Boolean(subject || topic || concept);
  const [dashboard, dueCards] = await Promise.all([
    hasScope
      ? Promise.resolve(null)
      : getFlashcardDashboardForUser(ctx.userId, ctx.workspaceId),
    listDueFlashcardsForUser({
      limit: 100,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    }),
  ]);

  const filteredDueCards = hasScope
    ? dueCards.filter((entry) => {
        const taxonomy = normalizeFlashcardTaxonomy(entry.card.source);
        return Boolean(
          taxonomy &&
            matchesTaxonomyScope(taxonomy, {
              concept,
              subject,
              topic,
            })
        );
      })
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
      : (dashboard?.dueCount ?? filteredDueCards.length),
  };
}
