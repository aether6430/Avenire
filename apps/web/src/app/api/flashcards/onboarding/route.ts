import { generateText, Output } from "@avenire/ai";
import { apollo } from "@avenire/ai/models";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createFlashcardCardForUser,
  createFlashcardSetForUser,
} from "@/lib/flashcards";
import { getWorkspaceContextForUser } from "@/lib/workspace";

const flashcardGenerationSchema = z.object({
  cards: z
    .array(
      z.object({
        backMarkdown: z.string().min(1),
        frontMarkdown: z.string().min(1),
        notesMarkdown: z.string().nullable().optional(),
        tags: z.array(z.string()).max(12).optional(),
      })
    )
    .min(1)
    .max(12),
  title: z.string().min(1),
});

const requestSchema = z.object({
  concept: z.string().min(1).max(200),
  count: z.number().int().min(1).max(12).optional(),
  reason: z.string().min(1).max(500),
  subject: z.string().min(1).max(120),
  title: z.string().min(1).max(200).optional(),
  topic: z.string().min(1).max(160),
});

function buildStudySource(input: z.infer<typeof requestSchema>) {
  return [
    `Concept: ${input.concept}`,
    `Subject: ${input.subject}`,
    `Topic: ${input.topic}`,
    `Reason: ${input.reason}`,
    "Generate flashcards that confront the wrong model, then teach the correct one.",
    "Keep the cards concise, specific, and directly useful for review.",
  ].join("\n");
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const source = buildStudySource(parsed.data);
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: flashcardGenerationSchema }),
    prompt: [
      "Create a clean flashcard deck from the misconception source.",
      `Return exactly ${Math.max(1, Math.min(parsed.data.count ?? 5, 12))} cards.`,
      "Use markdown for front and back content.",
      "Make the deck practical for a student reviewing the concept.",
      "Avoid fluff and avoid duplicate cards.",
      `Deck title hint: ${parsed.data.title ?? `${parsed.data.concept} correction`}`,
      `Source material:\n${source}`,
    ].join("\n\n"),
  });

  const set = await createFlashcardSetForUser({
    sourceChatSlug: "onboarding",
    sourceType: "ai-generated",
    title: parsed.data.title ?? result.output.title,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  if (!set) {
    return NextResponse.json(
      { error: "Unable to create set" },
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
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });

    if (created) {
      cards.push({
        backMarkdown: card.backMarkdown,
        frontMarkdown: card.frontMarkdown,
        id: created.id,
        notesMarkdown: card.notesMarkdown ?? null,
        tags: card.tags ?? [],
      });
    }
  }

  return NextResponse.json({
    cards,
    set: {
      id: set.id,
      title: set.title,
    },
  });
}
