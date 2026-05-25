import { generateText, Output } from "@avenire/ai";
import { apollo } from "@avenire/ai/models";
import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import {
  createFlashcardCardForUser,
  createFlashcardSetForUser,
} from "@/lib/flashcards";
import {
  buildFlashcardsOnboardingPrompt,
  buildFlashcardsOnboardingStudySource,
  FLASHCARDS_ONBOARDING_ERROR,
  flashcardsOnboardingGenerationSchema,
  parseFlashcardsOnboardingPayload,
  resolveFlashcardsOnboardingResponse,
  resolveFlashcardsOnboardingRouteError,
} from "./flashcards-onboarding-route-model";

export async function handleFlashcardsOnboardingRoutePost(input: {
  request: Request;
  userId: string;
  workspaceId: string;
}) {
  try {
    const payload = await input.request.json().catch(() => ({}));
    const parsed = parseFlashcardsOnboardingPayload(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const source = buildFlashcardsOnboardingStudySource(parsed.data);
    const result = await generateText({
      model: apollo.languageModel("apollo-core"),
      output: Output.object({ schema: flashcardsOnboardingGenerationSchema }),
      prompt: buildFlashcardsOnboardingPrompt({
        count: parsed.data.count,
        source,
        title: parsed.data.title ?? `${parsed.data.concept} correction`,
      }),
    });

    const set = await createFlashcardSetForUser({
      sourceChatSlug: "onboarding",
      sourceType: "ai-generated",
      title: parsed.data.title ?? result.output.title,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    if (!set) {
      return NextResponse.json(
        { error: "Unable to create Mindset Set." },
        { status: 500 }
      );
    }

    const cards: Array<{
      backMarkdown: string;
      frontMarkdown: string;
      id: string;
      notesMarkdown: string | null;
      tags: string[];
    }> = [];

    for (const [index, card] of result.output.cards.entries()) {
      const created = await createFlashcardCardForUser({
        backMarkdown: card.backMarkdown,
        frontMarkdown: card.frontMarkdown,
        kind: "flashcard",
        notesMarkdown: card.notesMarkdown ?? null,
        payload: {
          source: "onboarding",
          sourceIndex: index,
        },
        setId: set.id,
        source: {
          concept: parsed.data.concept,
          subject: parsed.data.subject,
          topic: parsed.data.topic,
        },
        tags: card.tags ?? [],
        userId: input.userId,
        workspaceId: input.workspaceId,
      });

      if (!created) {
        continue;
      }

      cards.push({
        backMarkdown: card.backMarkdown,
        frontMarkdown: card.frontMarkdown,
        id: created.id,
        notesMarkdown: card.notesMarkdown ?? null,
        tags: card.tags ?? [],
      });
    }

    await invalidateFlashcardReadCaches(input.workspaceId);

    return NextResponse.json(
      resolveFlashcardsOnboardingResponse({
        cards,
        set: {
          id: set.id,
          title: set.title,
        },
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsOnboardingRouteError(
          error,
          FLASHCARDS_ONBOARDING_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
