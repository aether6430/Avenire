import { generateText, Output } from "@avenire/ai";
import { apollo } from "@avenire/ai/models";
import type { chatToolSchemas } from "@avenire/ai/tools";
import type { z } from "zod";
import { resolveMisconceptionSeed } from "@/lib/chat-tools/chat-tool-misconception-runtime";
import {
  flashcardGenerationSchema,
  quizGenerationSchema,
} from "@/lib/chat-tools/chat-tool-models";
import {
  buildMisconceptionStudySource,
  buildTopicKey,
  inferFlashcardTaxonomy,
  normalizeStudyMatchKey,
} from "@/lib/chat-tools/study-tool-helpers";
import {
  buildWorkspacePathMaps,
  fetchWorkspaceFileText,
  isMarkdownFile,
} from "@/lib/chat-tools/workspace-file-helpers";
import { getFileAssetById } from "@/lib/file-data";
import {
  createFlashcardCardForUser,
  createFlashcardSetForUser,
  type FlashcardCardKind,
  getFlashcardDashboardForUser,
  getFlashcardSetForUser,
  normalizeFlashcardTaxonomy,
} from "@/lib/flashcards";
import { getIngestionSummaryForFile } from "@/lib/ingestion-data";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";

const STUDY_SOURCE_CHAR_LIMIT = 18_000;
const STUDY_QUERY_MATCH_LIMIT = 8;

interface StudyRuntimeContext {
  chatSlug: string;
  userId: string;
  workspaceId: string;
}

export async function resolveStudySource(
  ctx: StudyRuntimeContext,
  input: {
    fileId?: string;
    query?: string;
    sourceText?: string;
  }
) {
  if (typeof input.sourceText === "string") {
    const sourceText = input.sourceText.trim();
    if (!sourceText) {
      throw new Error("A study source is required.");
    }

    return {
      content: sourceText.slice(0, STUDY_SOURCE_CHAR_LIMIT),
      title: "Selected content",
    };
  }

  if (typeof input.fileId === "string") {
    const file = await getFileAssetById(ctx.workspaceId, input.fileId);
    if (!file) {
      throw new Error("Source file not found.");
    }

    const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
    const title = maps.filePathById.get(file.id) ?? file.name;

    if (isMarkdownFile(file)) {
      const content = (
        await fetchWorkspaceFileText(file, STUDY_SOURCE_CHAR_LIMIT)
      ).trim();
      if (!content) {
        throw new Error(
          "The selected file does not have ingested text available yet."
        );
      }

      return {
        content,
        title,
      };
    }

    const summary = await getIngestionSummaryForFile(ctx.workspaceId, file.id);
    const content = (summary?.resources ?? [])
      .flatMap((resource) => resource.chunks)
      .map((chunk) => chunk.content.trim())
      .filter(Boolean)
      .join("\n\n")
      .slice(0, STUDY_SOURCE_CHAR_LIMIT);

    if (!content) {
      throw new Error(
        "The selected file does not have ingested text available yet."
      );
    }

    return { content, title };
  }

  const query = input.query?.trim();
  if (!query) {
    throw new Error("A study source is required.");
  }

  const result = await retrieveWorkspaceChunksShared({
    query,
    limit: STUDY_QUERY_MATCH_LIMIT,
    origin: "chat",
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const content = result.results
    .map((match) => match.content.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, STUDY_SOURCE_CHAR_LIMIT);

  if (!content) {
    throw new Error("No matching study material was found for that query.");
  }

  return {
    content,
    title: query,
  };
}

export async function createStudySetWithCards(params: {
  cards: Array<{
    backMarkdown: string;
    frontMarkdown: string;
    kind: FlashcardCardKind;
    notesMarkdown?: string | null;
    payload?: Record<string, unknown>;
    source: Record<string, unknown>;
    tags?: string[];
  }>;
  chatSlug: string;
  title: string;
  userId: string;
  workspaceId: string;
}) {
  const firstTaxonomy = normalizeFlashcardTaxonomy(params.cards[0]?.source);
  if (!firstTaxonomy) {
    throw new Error("Generated study cards are missing taxonomy metadata.");
  }

  const dashboard = await getFlashcardDashboardForUser(
    params.userId,
    params.workspaceId
  );
  const targetTopicKey = buildTopicKey(firstTaxonomy);
  const titleKey = normalizeStudyMatchKey(params.title);
  const topicMatches = new Map<
    string,
    { matchCount: number; updatedAt: number; titleKey: string }
  >();

  for (const snapshot of dashboard?.cardSnapshots ?? []) {
    if (snapshot.archivedAt) {
      continue;
    }

    const taxonomy = normalizeFlashcardTaxonomy(snapshot.card.source);
    if (!taxonomy || buildTopicKey(taxonomy) !== targetTopicKey) {
      continue;
    }

    const existing = topicMatches.get(snapshot.card.setId) ?? {
      matchCount: 0,
      titleKey:
        normalizeStudyMatchKey(
          dashboard?.sets.find((set) => set.id === snapshot.card.setId)
            ?.title ?? ""
        ) ?? "",
      updatedAt: 0,
    };
    existing.matchCount += 1;
    existing.updatedAt = Math.max(
      existing.updatedAt,
      Date.parse(snapshot.card.updatedAt)
    );
    topicMatches.set(snapshot.card.setId, existing);
  }

  let targetSetId =
    Array.from(topicMatches.entries())
      .sort((left, right) => {
        if (left[1].matchCount !== right[1].matchCount) {
          return right[1].matchCount - left[1].matchCount;
        }

        if (left[1].titleKey === titleKey && right[1].titleKey !== titleKey) {
          return -1;
        }

        if (right[1].titleKey === titleKey && left[1].titleKey !== titleKey) {
          return 1;
        }

        return right[1].updatedAt - left[1].updatedAt;
      })
      .at(0)?.[0] ?? null;

  if (!targetSetId && dashboard) {
    targetSetId =
      dashboard.sets.find(
        (set) => normalizeStudyMatchKey(set.title) === titleKey
      )?.id ?? null;
  }

  let set =
    typeof targetSetId === "string"
      ? await getFlashcardSetForUser(
          params.userId,
          params.workspaceId,
          targetSetId
        )
      : null;

  if (!set) {
    set = await createFlashcardSetForUser({
      sourceChatSlug: params.chatSlug,
      sourceType: "ai-generated",
      title: params.title,
      userId: params.userId,
      workspaceId: params.workspaceId,
    });
  }

  if (!set) {
    throw new Error("Unable to create the study set.");
  }

  for (const card of params.cards) {
    const createdCard = await createFlashcardCardForUser({
      backMarkdown: card.backMarkdown,
      frontMarkdown: card.frontMarkdown,
      kind: card.kind,
      notesMarkdown: card.notesMarkdown,
      payload: card.payload,
      setId: set.id,
      source: card.source,
      tags: card.tags,
      userId: params.userId,
      workspaceId: params.workspaceId,
    });
    if (!createdCard) {
      throw new Error("Unable to persist every generated study card.");
    }
  }

  return (
    (await getFlashcardSetForUser(params.userId, params.workspaceId, set.id)) ??
    set
  );
}

export async function generateFlashcardsFromSource(
  ctx: StudyRuntimeContext,
  input: z.infer<typeof chatToolSchemas.generate_flashcards.input>
) {
  const source = await resolveStudySource(ctx, input);
  const taxonomy = inferFlashcardTaxonomy({
    query: input.query,
    sourceText: source.content,
    title: input.title ?? source.title,
  });
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: flashcardGenerationSchema }),
    prompt: [
      "Create a clean Mindset Set from the study material.",
      "Write concise markdown front/back pairs.",
      `Return exactly ${Math.max(1, Math.min(input.count ?? 10, 24))} cards.`,
      "Avoid duplicate cards.",
      `Mindset title hint: ${input.title ?? source.title}`,
      `Study material:\n${source.content}`,
    ].join("\n\n"),
  });

  const set = await createStudySetWithCards({
    cards: result.output.cards.map((card, index) => ({
      ...card,
      kind: "flashcard" as const,
      source: {
        ...taxonomy,
        sourceFileId: input.fileId ?? null,
        sourceIndex: index,
        sourceQuery: input.query ?? null,
      },
      tags: card.tags ?? input.tags ?? [],
    })),
    chatSlug: ctx.chatSlug,
    title: input.title ?? result.output.title,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    cards: result.output.cards,
    setId: set.id,
    title: set.title,
  };
}

export async function generateFlashcardsFromMisconception(
  ctx: StudyRuntimeContext,
  input: z.infer<
    typeof chatToolSchemas.generate_flashcards_from_misconception.input
  >
) {
  const misconception = await resolveMisconceptionSeed(ctx, {
    concept: input.concept,
    reason: input.reason,
    subject: input.subject,
    topic: input.topic,
  });

  const sourceText = buildMisconceptionStudySource(misconception);
  return generateFlashcardsFromSource(ctx, {
    count: input.count,
    sourceText,
    tags: input.tags,
    title: input.title ?? `${misconception.concept} correction`,
  });
}

export async function generateQuizFromSource(
  ctx: StudyRuntimeContext,
  input: z.infer<typeof chatToolSchemas.quiz_me.input>
) {
  const source = await resolveStudySource(ctx, input);
  const taxonomy = inferFlashcardTaxonomy({
    query: input.query,
    sourceText: source.content,
    title: input.title ?? source.title,
  });
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: quizGenerationSchema }),
    prompt: [
      "Create a multiple choice quiz from the study material.",
      "Each question must have 4 options when possible.",
      "Use frontMarkdown for the question stem and backMarkdown for the answer explanation.",
      `Return exactly ${Math.max(3, Math.min(input.count ?? 4, 5))} questions.`,
      `Quiz title hint: ${input.title ?? source.title}`,
      `Study material:\n${source.content}`,
    ].join("\n\n"),
  });

  const questions = result.output.questions.map((question) => ({
    ...question,
    explanation: question.explanation ?? null,
  }));

  const set = await createStudySetWithCards({
    cards: questions.map((question, index) => ({
      backMarkdown: question.backMarkdown,
      frontMarkdown: question.frontMarkdown,
      kind: "multiple_choice_quiz" as const,
      payload: {
        correctOptionIndex: question.correctOptionIndex,
        explanation: question.explanation ?? null,
        options: question.options,
      },
      source: {
        ...taxonomy,
        sourceFileId: input.fileId ?? null,
        sourceIndex: index,
        sourceQuery: input.query ?? null,
      },
      tags: question.tags ?? input.tags ?? [],
    })),
    chatSlug: ctx.chatSlug,
    title: input.title ?? result.output.title,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    questionCount: questions.length,
    questions,
    setId: set.id,
    title: set.title,
  };
}
