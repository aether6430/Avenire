import { generateText, Output, type ToolSet, tool } from "@avenire/ai";
import type {
  AgentActivityAction,
  AgentActivityData,
} from "@avenire/ai/message-types";
import { apollo } from "@avenire/ai/models";
import {
  AVAILABLE_STUDY_SKILLS,
  AVAILABLE_VISUAL_SKILLS,
  loadSkills,
} from "@avenire/ai/skills";
import {
  chatToolSchemas,
  legacyShowWidgetInputSchema,
} from "@avenire/ai/tools";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { logInfo } from "@avenire/observability";
import { tavily } from "@tavily/core";
import type { z } from "zod";
import {
  agentSelectionSchema,
  buildAgentSelectionPrompt,
  buildFileManagerSelectionPrompt,
  flashcardGenerationSchema,
  noteDraftSchema,
  noteRewriteSchema,
  quizGenerationSchema,
} from "@/lib/chat-tools/chat-tool-models";
import {
  buildNoteContent,
  extractTagDirective,
  getFileTags,
  normalizeTagList,
  parseRequestedNoteDestination,
  sanitizeNoteTitle,
  stripLeadingTitleHeading,
  type TagDirective,
  toMarkdownFileName,
} from "@/lib/chat-tools/note-file-helpers";
import {
  buildCitationMarkdown,
  buildMisconceptionContext,
  buildMisconceptionStudySource,
  buildTopicKey,
  inferFlashcardTaxonomy,
  MISCONCEPTION_CONTEXT_LIMIT,
  mapMisconceptionForTool,
  matchesTaxonomyScope,
  normalizeMisconceptionSubjectKey,
  normalizeStudyMatchKey,
} from "@/lib/chat-tools/study-tool-helpers";
import {
  buildWorkspacePathMaps,
  type ExplorerFileLike,
  ensureWritableTargetFolder,
  fetchWorkspaceFileText,
  findTargetNoteFile,
  getWorkspacePathForFile,
  isMarkdownFile,
  normalizeWorkspacePath,
  publishTreeMutationEvents,
  resolveFileExcerpt,
  resolveFolderIdByPathHint,
  resolveWorkspaceSearchMatches,
  type WorkspacePathMaps,
} from "@/lib/chat-tools/workspace-file-helpers";
import {
  createFolder,
  createWorkspaceNoteFile,
  getFileAssetById,
  listWorkspaceFiles,
  updateFileAsset,
  updateNoteContent,
  userCanEditFile,
} from "@/lib/file-data";
import {
  createFlashcardCardForUser,
  createFlashcardSetForUser,
  type FlashcardCardKind,
  getFlashcardDashboardForUser,
  getFlashcardSetForUser,
  listDueFlashcardsForUser,
  normalizeFlashcardTaxonomy,
} from "@/lib/flashcards";
import {
  deleteIngestionDataForFile,
  getIngestionSummaryForFile,
} from "@/lib/ingestion-data";
import {
  getActiveMisconceptions,
  improveMisconceptionsForConcept,
  type MisconceptionRecord,
  recomputeConceptMastery,
  resolveMisconceptionsForConcept,
  upsertMisconception,
} from "@/lib/learning-data";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

const DEFAULT_SEARCH_LIMIT = 8;
const DEFAULT_WEB_SEARCH_LIMIT = 5;
const _DEFAULT_FILE_LIST_LIMIT = 50;
const DEFAULT_DUE_CARD_LIMIT = 5;
const STUDY_SOURCE_CHAR_LIMIT = 18_000;
const STUDY_QUERY_MATCH_LIMIT = 8;
const NOTES_FOLDER_NAME = "Notes";
const AGENT_DEFAULT_MATCH_LIMIT = 10;
const AGENT_DEFAULT_MAX_FILES = 3;
const AGENT_MAX_FILE_CHARS = 4000;
const AGENT_MAX_OUTPUT_TOKENS = 220;
const FILE_MANAGER_DEFAULT_MAX_FILES = 4;
const FILE_MANAGER_LIST_LIMIT = 120;
const FILE_MANAGER_MAX_FILE_CHARS = 5000;
const FILE_MANAGER_MAX_OUTPUT_TOKENS = 260;

interface ChatToolContext {
  agentActivityId: string;
  chatSlug: string;
  emitAgentActivity?: (data: AgentActivityData) => void;
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

interface ChatToolOptions {
  legacyShowWidgetSchema?: boolean;
}

export async function getActiveMisconceptionContext(params: {
  subject?: string | null;
  topic?: string | null;
  userId: string;
  workspaceId: string;
}) {
  const subject = params.subject?.trim();
  const topic = params.topic?.trim();
  if (!(subject && topic)) {
    return null;
  }

  const misconceptions = await getActiveMisconceptions({
    limit: 24,
    subject,
    topic,
    userId: params.userId,
    workspaceId: params.workspaceId,
  });
  const active = misconceptions
    .filter(
      (misconception) =>
        normalizeMisconceptionSubjectKey(misconception.subject) ===
        normalizeMisconceptionSubjectKey(subject)
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MISCONCEPTION_CONTEXT_LIMIT);

  if (active.length > 0) {
    logInfo({
      eventName: "misconception.confirmed.injected",
      payload: {
        activeCount: active.length,
        subject,
        topic,
        userId: params.userId,
        workspaceId: params.workspaceId,
      },
    });
  }

  return buildMisconceptionContext(active);
}
function emitAgentActivityUpdate(
  ctx: ChatToolContext,
  actions: AgentActivityAction[],
  status: AgentActivityData["status"] = "running"
) {
  ctx.emitAgentActivity?.({
    actions,
    id: ctx.agentActivityId,
    status,
  });
}

async function generateNoteDraftFromTask(input: {
  task: string;
  titleHint?: string | null;
}) {
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: noteDraftSchema }),
    prompt: [
      "Write a clean markdown note from the request.",
      "Return a concise, specific title and a polished markdown body.",
      "Do not include frontmatter or code fences unless the note explicitly needs them.",
      "Do not include a top-level H1 heading in bodyMarkdown.",
      input.titleHint
        ? `Use this exact note title: ${sanitizeNoteTitle(input.titleHint)}`
        : "Generate the note title from the request.",
      `Request:\n${input.task}`,
    ].join("\n\n"),
    maxOutputTokens: 5000,
    temperature: 0.25,
  });

  const title = sanitizeNoteTitle(input.titleHint ?? result.output.title);
  const body = stripLeadingTitleHeading(result.output.bodyMarkdown, title);

  return {
    bodyMarkdown: body.length > 0 ? body : result.output.bodyMarkdown.trim(),
    title,
  };
}

async function rewriteNoteFromTask(input: {
  currentMarkdown: string;
  fileName: string;
  task: string;
}) {
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: noteRewriteSchema }),
    prompt: [
      "Revise the markdown note to satisfy the edit request.",
      "Return the full updated markdown note, not a diff.",
      "Preserve useful structure and existing detail unless the request clearly asks to remove or reorganize content.",
      "Do not add commentary outside the note.",
      `Edit request:\n${input.task}`,
      `Current note (${input.fileName}):\n${input.currentMarkdown}`,
    ].join("\n\n"),
    maxOutputTokens: 8000,
    temperature: 0.2,
  });

  return `${result.output.markdown.trim()}\n`;
}

async function updateFileTags(params: {
  file: ExplorerFileLike;
  tagDirective: TagDirective | null;
  userId: string;
  workspaceId: string;
}) {
  if (!params.tagDirective) {
    return params.file;
  }

  const currentTags = getFileTags(params.file);
  const directive = params.tagDirective;
  const nextTags =
    directive.action === "replace"
      ? directive.tags
      : directive.action === "add"
        ? normalizeTagList([...currentTags, ...directive.tags])
        : currentTags.filter((tag) => !directive.tags.includes(tag));

  const currentPage = params.file.page ?? {
    bannerUrl: null,
    icon: null,
    properties: {},
  };

  const nextFile = await updateFileAsset(
    params.workspaceId,
    params.file.id,
    params.userId,
    {
      metadata: {
        page: {
          ...currentPage,
          properties: {
            ...currentPage.properties,
            tags: {
              type: "multi_select",
              value: nextTags,
            },
          },
        },
      },
    }
  );

  return nextFile ?? params.file;
}

async function ensureNotesFolder(input: {
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}) {
  const folder = await createFolder(
    input.workspaceId,
    input.rootFolderId,
    NOTES_FOLDER_NAME,
    input.userId
  );

  if (!folder) {
    throw new Error("Unable to create or resolve the Notes folder.");
  }

  return folder;
}

async function resolveCreateNoteFolder(
  ctx: ChatToolContext,
  maps: WorkspacePathMaps,
  hint?: string
) {
  if (hint && normalizeWorkspacePath(hint).length > 0) {
    const existingFolderId = resolveFolderIdByPathHint(
      maps,
      ctx.rootFolderId,
      hint
    );
    if (existingFolderId) {
      await ensureWritableTargetFolder(ctx, existingFolderId);
      return existingFolderId;
    }
  }

  const notesFolder = await ensureNotesFolder({
    rootFolderId: ctx.rootFolderId,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
  await ensureWritableTargetFolder(ctx, notesFolder.id);
  return notesFolder.id;
}

async function enqueueIngestionForFile(input: {
  fileId: string;
  folderId?: string;
  workspaceId: string;
}) {
  const ingestionJob = await scheduleIngestionJob({
    workspaceId: input.workspaceId,
    fileId: input.fileId,
  }).catch(() => null);

  await Promise.allSettled([
    publishWorkspaceStreamEvent({
      workspaceUuid: input.workspaceId,
      type: "upload.finalized",
      payload: {
        deduplicated: false,
        fileId: input.fileId,
        folderId: input.folderId ?? null,
        workspaceUuid: input.workspaceId,
      },
    }),
    ...(ingestionJob
      ? [
          publishWorkspaceStreamEvent({
            workspaceUuid: input.workspaceId,
            type: "ingestion.job",
            payload: {
              createdAt: new Date().toISOString(),
              eventType: "job.queued",
              jobId: ingestionJob.id,
              payload: { status: "queued", source: "chat.tools" },
              workspaceId: input.workspaceId,
            },
          }),
        ]
      : []),
  ]);

  return ingestionJob;
}

async function resolveStudySource(
  ctx: ChatToolContext,
  input: {
    fileId?: string;
    query?: string;
    sourceText?: string;
  }
) {
  if (typeof input.sourceText === "string") {
    return {
      content: input.sourceText.trim().slice(0, STUDY_SOURCE_CHAR_LIMIT),
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
      return {
        content: (
          await fetchWorkspaceFileText(file, STUDY_SOURCE_CHAR_LIMIT)
        ).trim(),
        title,
      };
    }

    const summary = await getIngestionSummaryForFile(ctx.workspaceId, file.id);
    const content = summary.resources
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

async function createStudySetWithCards(params: {
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
    await createFlashcardCardForUser({
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
  }

  return (
    (await getFlashcardSetForUser(params.userId, params.workspaceId, set.id)) ??
    set
  );
}

async function generateFlashcardsFromSource(
  ctx: ChatToolContext,
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
      "Create a clean mindset set from the study material.",
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

async function generateFlashcardsFromMisconception(
  ctx: ChatToolContext,
  input: z.infer<
    typeof chatToolSchemas.generate_flashcards_from_misconception.input
  >
) {
  const misconceptions = await getActiveMisconceptions({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
  const misconception =
    misconceptions[0] ??
    ({
      active: true,
      decayedAt: null,
      confidence: 0.85,
      concept: input.concept,
      createdAt: new Date().toISOString(),
      evidenceCount: 0,
      evidenceClass: "manual",
      evidenceRootId: null,
      evidenceSpan: null,
      firstSeenAt: new Date().toISOString(),
      id: "draft",
      lastSeenAt: new Date().toISOString(),
      promotedAt: new Date().toISOString(),
      reason: input.reason,
      resolvedAt: null,
      source: "manual",
      sourceSessionId: null,
      subject: input.subject,
      status: "confirmed",
      topic: input.topic,
      updatedAt: new Date().toISOString(),
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    } satisfies MisconceptionRecord);

  const sourceText = buildMisconceptionStudySource(misconception);
  const generated = await generateFlashcardsFromSource(ctx, {
    count: input.count,
    sourceText,
    tags: input.tags,
    title: input.title ?? `${misconception.concept} correction`,
  });

  return generated;
}

async function listMisconceptionsForTool(
  ctx: ChatToolContext,
  input: z.infer<typeof chatToolSchemas.list_misconceptions.input>
) {
  const misconceptions = await getActiveMisconceptions({
    concept: input.concept,
    limit: input.limit,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    count: misconceptions.length,
    misconceptions: misconceptions.map(mapMisconceptionForTool),
    summary:
      misconceptions.length > 0
        ? `Found ${misconceptions.length} active misconception(s).`
        : "No active misconceptions found.",
  };
}

async function resolveMisconceptionForTool(
  ctx: ChatToolContext,
  input: z.infer<typeof chatToolSchemas.resolve_misconception.input>
) {
  const resolved = await resolveMisconceptionsForConcept({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  await recomputeConceptMastery({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const remaining = await getActiveMisconceptions({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    remainingActiveCount: remaining.length,
    resolvedCount: resolved.length,
    summary:
      resolved.length > 0
        ? `Resolved ${resolved.length} misconception(s).`
        : "No active misconception matched that concept.",
  };
}

async function improveMisconceptionForTool(
  ctx: ChatToolContext,
  input: z.infer<typeof chatToolSchemas.improve_misconception.input>
) {
  const improved = await improveMisconceptionsForConcept({
    concept: input.concept,
    decay: input.decay,
    resolveThreshold: input.resolveThreshold,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  await recomputeConceptMastery({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const remaining = await getActiveMisconceptions({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const resolvedCount = improved.filter((item) => !item.active).length;

  return {
    improvedCount: improved.length,
    remainingActiveCount: remaining.length,
    resolvedCount,
    summary:
      improved.length > 0
        ? `Improved ${improved.length} misconception(s).`
        : "No active misconception matched that concept.",
  };
}

async function generateQuizFromSource(
  ctx: ChatToolContext,
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

  const questions = result.output.questions.map((question, _index) => ({
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

async function runWebSearch(
  input: z.infer<typeof chatToolSchemas.web_search.input>
) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is required for web_search.");
  }

  const client = tavily({ apiKey });
  const response = await client.search(input.query, {
    includeAnswer: input.includeAnswer ?? true,
    includeFavicon: true,
    maxResults: input.maxResults ?? DEFAULT_WEB_SEARCH_LIMIT,
    searchDepth: "advanced",
    topic: input.topic ?? "general",
  });

  return {
    answer: response.answer?.trim() || undefined,
    query: response.query,
    results: response.results.map((result) => ({
      content: result.content,
      favicon: result.favicon,
      publishedDate: result.publishedDate,
      score: result.score,
      title: result.title,
      url: result.url,
    })),
    totalResults: response.results.length,
  };
}

export function createChatTools(
  ctx: ChatToolContext,
  options: ChatToolOptions = {}
): ToolSet {
  const showWidgetInputSchema = options.legacyShowWidgetSchema
    ? (legacyShowWidgetInputSchema as unknown as typeof chatToolSchemas.show_widget.input)
    : chatToolSchemas.show_widget.input;

  return {
    web_search: tool({
      description:
        "Search the public web with Tavily and return relevant sources. Use when the user asks for current events, recent facts, external sources, or information outside the workspace.",
      inputSchema: chatToolSchemas.web_search.input,
      outputSchema: chatToolSchemas.web_search.output,
      execute: runWebSearch,
    }),
    search_materials: tool({
      description:
        "Semantic search over workspace materials with file citations. Use only when the user asks about their files/workspace or requests a workspace search.",
      inputSchema: chatToolSchemas.search_materials.input,
      outputSchema: chatToolSchemas.search_materials.output,
      execute: async (input) => {
        const { matches } = await resolveWorkspaceSearchMatches({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          query: input.query,
          limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
          mode: input.mode ?? "auto",
          sourceType: input.sourceType,
        });

        return {
          citationMarkdown: buildCitationMarkdown(matches),
          matches,
          query: input.query,
          totalMatches: matches.length,
        };
      },
    }),
    avenire_agent: tool({
      description:
        "Run the Avenire retrieval agent to gather workspace context and return a consolidated summary. Use only when the user asks about their files/workspace or explicitly wants workspace context.",
      inputSchema: chatToolSchemas.avenire_agent.input,
      outputSchema: chatToolSchemas.avenire_agent.output,
      execute: async (input) => {
        const maxMatches = input.maxMatches ?? AGENT_DEFAULT_MATCH_LIMIT;
        const maxFiles = input.maxFiles ?? AGENT_DEFAULT_MAX_FILES;
        const activityActions: AgentActivityAction[] = [
          {
            kind: "search",
            pending: true,
            value: input.query,
            preview: { query: input.query, matches: [] },
          },
        ];

        emitAgentActivityUpdate(ctx, activityActions, "running");

        const { maps, matches } = await resolveWorkspaceSearchMatches({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          query: input.query,
          limit: maxMatches,
          sourceType: undefined,
        });

        const indexedMatches = matches.map((match, index) => ({
          index,
          fileId: match.fileId,
          snippet: match.snippet,
          sourceType: match.sourceType,
          workspacePath: match.workspacePath,
        }));

        const searchMatches = matches
          .map((match) => match.workspacePath)
          .filter(Boolean)
          .slice(0, 6);

        activityActions[0] = {
          kind: "search",
          pending: false,
          value: input.query,
          preview: { query: input.query, matches: searchMatches },
        };
        emitAgentActivityUpdate(ctx, activityActions, "running");

        let selectedFileIds: string[] = [];
        if (indexedMatches.length > 0) {
          const selection = await generateText({
            model: apollo.languageModel("apollo-agent"),
            output: Output.object({ schema: agentSelectionSchema }),
            prompt: buildAgentSelectionPrompt({
              query: input.query,
              matches: indexedMatches,
              maxFiles,
            }),
          });

          const selectedIndices = Array.from(
            new Set(
              selection.output.indices.filter(
                (index) =>
                  Number.isFinite(index) &&
                  index >= 0 &&
                  index < indexedMatches.length
              )
            )
          ).slice(0, maxFiles);

          selectedFileIds = selectedIndices
            .map((index) => indexedMatches[index]?.fileId)
            .filter((fileId): fileId is string => Boolean(fileId));
        }

        const readActionIndexByFileId = new Map<string, number>();
        for (const fileId of selectedFileIds) {
          const workspacePath =
            maps.filePathById.get(fileId) ?? "workspace file";
          readActionIndexByFileId.set(fileId, activityActions.length);
          activityActions.push({
            kind: "read",
            pending: true,
            value: workspacePath,
          });
        }

        if (selectedFileIds.length > 0) {
          emitAgentActivityUpdate(ctx, activityActions, "running");
        }

        const files: Array<{
          excerpt: string;
          fileId: string | null;
          workspacePath: string;
        }> = [];

        for (const fileId of selectedFileIds) {
          const preview = await resolveFileExcerpt({
            workspaceId: ctx.workspaceId,
            fileId,
            maxChars: AGENT_MAX_FILE_CHARS,
            maps,
          });
          if (preview) {
            files.push(preview);
            const actionIndex = readActionIndexByFileId.get(fileId);
            if (actionIndex !== undefined) {
              activityActions[actionIndex] = {
                kind: "read",
                pending: false,
                value: preview.workspacePath,
                preview: {
                  content: preview.excerpt,
                  path: preview.workspacePath,
                },
              };
              emitAgentActivityUpdate(ctx, activityActions, "running");
            }
          }
        }

        const contextBlocks =
          files.length > 0
            ? files.map(
                (file) => `File: ${file.workspacePath}\n${file.excerpt.trim()}`
              )
            : matches
                .slice(0, 6)
                .map(
                  (match) =>
                    `Match: ${match.workspacePath}\n${match.snippet.trim()}`
                );

        const context = contextBlocks.join("\n\n").trim();
        const summaryResult = await generateText({
          model: apollo.languageModel("apollo-agent"),
          prompt: [
            "Summarize the retrieved workspace context for the user's query.",
            "Use 2-4 concise sentences.",
            "If nothing relevant was found, say that clearly.",
            `Query: ${input.query}`,
            "Context:",
            context || "No relevant workspace content found.",
          ].join("\n\n"),
          maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
          temperature: 0.3,
        });

        const summary =
          summaryResult.text.trim() || "No relevant context found.";
        emitAgentActivityUpdate(ctx, activityActions, "done");

        return {
          citationMarkdown: buildCitationMarkdown(matches),
          citations: matches.slice(0, maxMatches),
          context: context || "No relevant workspace content found.",
          files,
          query: input.query,
          summary,
        };
      },
    }),
    file_manager_agent: tool({
      description: `Inspect and manage workspace files and folders. Handles listing, reading, moving, deleting files, and creating/managing folders. Use when the user asks about their files, wants to organize their workspace, or needs file operations.

Internal capabilities:
- list_files: List files and folders
- read_workspace_file: Read file content
- get_file_summary: Get ingestion metadata
- move_file: Move file to folder
- delete_file: Move file to trash
- create_folder: Create new folder
- move_folder: Move folder
- delete_folder: Move folder to trash

The agent decides which operations to perform based on the task.`,
      inputSchema: chatToolSchemas.file_manager_agent.input,
      outputSchema: chatToolSchemas.file_manager_agent.output,
      execute: async (input) => {
        const maxFiles = input.maxFiles ?? FILE_MANAGER_DEFAULT_MAX_FILES;
        const activityActions: AgentActivityAction[] = [
          {
            kind: "list",
            pending: true,
            value: "workspace files",
          },
        ];

        emitAgentActivityUpdate(ctx, activityActions, "running");

        const [maps, files] = await Promise.all([
          buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
          listWorkspaceFiles(ctx.workspaceId, ctx.userId),
        ]);

        const candidateFiles = [...files]
          .sort(
            (left, right) =>
              Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
          )
          .slice(0, FILE_MANAGER_LIST_LIMIT)
          .map((file) => ({
            fileId: file.id,
            mimeType: file.mimeType ?? null,
            updatedAt: file.updatedAt,
            workspacePath: getWorkspacePathForFile(file, maps),
          }));

        activityActions[0] = {
          kind: "list",
          pending: false,
          value: "workspace files",
        };
        emitAgentActivityUpdate(ctx, activityActions, "running");

        let selectedFileIds: string[] = [];
        if (candidateFiles.length > 0) {
          const selection = await generateText({
            model: apollo.languageModel("apollo-agent"),
            output: Output.object({ schema: agentSelectionSchema }),
            prompt: buildFileManagerSelectionPrompt({
              files: candidateFiles,
              maxFiles,
              task: input.task,
            }),
          });

          selectedFileIds = Array.from(
            new Set(
              selection.output.indices
                .filter(
                  (index) =>
                    Number.isFinite(index) &&
                    index >= 0 &&
                    index < candidateFiles.length
                )
                .map((index) => candidateFiles[index]?.fileId)
                .filter((fileId): fileId is string => Boolean(fileId))
            )
          ).slice(0, maxFiles);
        }

        const readActionIndexByFileId = new Map<string, number>();
        for (const fileId of selectedFileIds) {
          const workspacePath =
            maps.filePathById.get(fileId) ?? "workspace file";
          readActionIndexByFileId.set(fileId, activityActions.length);
          activityActions.push({
            kind: "read",
            pending: true,
            value: workspacePath,
          });
        }

        if (selectedFileIds.length > 0) {
          emitAgentActivityUpdate(ctx, activityActions, "running");
        }

        const filesToInspect: Array<{
          excerpt: string;
          fileId: string | null;
          workspacePath: string;
        }> = [];

        for (const fileId of selectedFileIds) {
          const preview = await resolveFileExcerpt({
            workspaceId: ctx.workspaceId,
            fileId,
            maxChars: FILE_MANAGER_MAX_FILE_CHARS,
            maps,
          });

          if (!preview) {
            continue;
          }

          filesToInspect.push(preview);
          const actionIndex = readActionIndexByFileId.get(fileId);
          if (actionIndex !== undefined) {
            activityActions[actionIndex] = {
              kind: "read",
              pending: false,
              value: preview.workspacePath,
              preview: {
                content: preview.excerpt,
                path: preview.workspacePath,
              },
            };
            emitAgentActivityUpdate(ctx, activityActions, "running");
          }
        }

        const context =
          filesToInspect.length > 0
            ? filesToInspect
                .map(
                  (file) =>
                    `File: ${file.workspacePath}\n${file.excerpt.trim()}`
                )
                .join("\n\n")
            : candidateFiles
                .slice(0, Math.min(maxFiles, 8))
                .map(
                  (file) =>
                    `Path: ${file.workspacePath}\nMime: ${file.mimeType ?? "unknown"}\nUpdated: ${file.updatedAt}`
                )
                .join("\n\n");

        const summaryResult = await generateText({
          model: apollo.languageModel("apollo-agent"),
          prompt: [
            "You are a file manager agent.",
            "Summarize the relevant workspace files for the task.",
            "Do not claim that any files were moved or deleted unless that already happened outside this tool.",
            "If the task is ambiguous, say what still needs clarification.",
            `Task: ${input.task}`,
            "Context:",
            context || "No relevant files found.",
          ].join("\n\n"),
          maxOutputTokens: FILE_MANAGER_MAX_OUTPUT_TOKENS,
          temperature: 0.2,
        });

        emitAgentActivityUpdate(ctx, activityActions, "done");

        return {
          files: filesToInspect,
          summary: summaryResult.text.trim() || "No relevant files found.",
          task: input.task,
        };
      },
    }),
    note_agent: tool({
      description: `Manage markdown notes in the workspace. Handles creating, reading, and updating notes. Use when the user asks about their notes or wants to create/modify notes.

Internal capabilities:
- create_note: Create new markdown note
- read_note: Read existing note content
- update_note: Append or replace note content (append, replace_entire, replace_section)
- update_tags: Read and update note tags stored in file properties

The agent decides which operations to perform based on the task.`,
      inputSchema: chatToolSchemas.note_agent.input,
      outputSchema: chatToolSchemas.note_agent.output,
      execute: async (input) => {
        const maxNotes = input.maxNotes ?? 3;
        const task = input.task.toLowerCase();

        const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
        const allFiles = await listWorkspaceFiles(ctx.workspaceId, ctx.userId);
        const noteFiles = allFiles.filter(isMarkdownFile);

        let operation: "created" | "read" | "updated" | "listed" = "listed";
        const notes: Array<{
          contentPreview: string;
          fileId: string;
          tags?: string[];
          title: string;
          updatedAt: string;
          wordCount: number;
          workspacePath: string;
        }> = [];

        if (
          task.includes("create") ||
          task.includes("new") ||
          task.includes("write")
        ) {
          operation = "created";
          const tagDirective = extractTagDirective(input.task);
          const destination = parseRequestedNoteDestination(input.task);
          const draft = await generateNoteDraftFromTask({
            task: input.task,
            titleHint: destination.title,
          });
          const targetFolderId = await resolveCreateNoteFolder(
            ctx,
            maps,
            destination.folderHint
          );
          const content = buildNoteContent({
            content: draft.bodyMarkdown,
            title: draft.title,
          });
          const fileName =
            destination.fileName || toMarkdownFileName(draft.title);
          const file = await createWorkspaceNoteFile({
            baseContent: content,
            content,
            folderId: targetFolderId,
            metadata: {
              agentNote: true,
              ...(tagDirective && tagDirective.tags.length > 0
                ? {
                    page: {
                      bannerUrl: null,
                      icon: null,
                      properties: {
                        tags: {
                          type: "multi_select",
                          value: tagDirective.tags,
                        },
                      },
                    },
                  }
                : {}),
            },
            name: fileName,
            userId: ctx.userId,
            workspaceId: ctx.workspaceId,
          });

          await publishTreeMutationEvents({
            fileId: file.id,
            folderId: targetFolderId,
            reason: "file.created",
            workspaceId: ctx.workspaceId,
          });
          await enqueueIngestionForFile({
            fileId: file.id,
            folderId: file.folderId,
            workspaceId: ctx.workspaceId,
          });

          const newMaps = await buildWorkspacePathMaps(
            ctx.workspaceId,
            ctx.userId
          );
          notes.push({
            contentPreview: content.slice(0, 500),
            fileId: file.id,
            tags: getFileTags(file),
            title: file.name,
            updatedAt: file.updatedAt,
            wordCount: content.split(/\s+/).length,
            workspacePath: newMaps.filePathById.get(file.id) ?? file.name,
          });
        } else if (
          task.includes("read") ||
          task.includes("show") ||
          task.includes("what")
        ) {
          operation = "read";
          const targetNote = findTargetNoteFile({
            maps,
            noteFiles,
            task: input.task,
          });
          const relevantNotes = targetNote
            ? [targetNote]
            : noteFiles.slice(0, maxNotes);
          for (const file of relevantNotes) {
            try {
              const content = await fetchWorkspaceFileText(file, 500);
              notes.push({
                contentPreview: content.slice(0, 500),
                fileId: file.id,
                tags: getFileTags(file),
                title: file.name,
                updatedAt: file.updatedAt,
                wordCount: content.split(/\s+/).length,
                workspacePath: maps.filePathById.get(file.id) ?? file.name,
              });
            } catch {}
          }
        } else if (
          task.includes("update") ||
          task.includes("add") ||
          task.includes("append")
        ) {
          operation = "updated";
          const noteFile = findTargetNoteFile({
            maps,
            noteFiles,
            task: input.task,
          });
          if (noteFile) {
            const tagDirective = extractTagDirective(input.task);
            const canEdit = await userCanEditFile({
              workspaceId: ctx.workspaceId,
              fileId: noteFile.id,
              userId: ctx.userId,
            });
            if (canEdit) {
              const currentContent = await fetchWorkspaceFileText(
                noteFile,
                50_000
              );
              const nextContent = await rewriteNoteFromTask({
                currentMarkdown: currentContent,
                fileName: noteFile.name,
                task: input.task,
              });
              const updated = await updateNoteContent({
                baseContent: currentContent,
                fileId: noteFile.id,
                userId: ctx.userId,
                content: nextContent,
              });
              if (updated) {
                const fileWithTags = await updateFileTags({
                  file: noteFile,
                  tagDirective,
                  userId: ctx.userId,
                  workspaceId: ctx.workspaceId,
                });
                await deleteIngestionDataForFile(ctx.workspaceId, noteFile.id);
                await publishTreeMutationEvents({
                  fileId: noteFile.id,
                  folderId: noteFile.folderId,
                  reason: "file.updated",
                  workspaceId: ctx.workspaceId,
                });
                await enqueueIngestionForFile({
                  fileId: noteFile.id,
                  folderId: noteFile.folderId,
                  workspaceId: ctx.workspaceId,
                });
                notes.push({
                  contentPreview: nextContent.slice(0, 500),
                  fileId: noteFile.id,
                  tags: getFileTags(fileWithTags),
                  title: noteFile.name,
                  updatedAt: updated.updatedAt.toISOString(),
                  wordCount: nextContent.split(/\s+/).length,
                  workspacePath:
                    maps.filePathById.get(noteFile.id) ?? noteFile.name,
                });
              }
            }
          }
        } else {
          operation = "listed";
          for (const file of noteFiles.slice(0, maxNotes)) {
            try {
              const content = await fetchWorkspaceFileText(file, 200);
              notes.push({
                contentPreview: content.slice(0, 200),
                fileId: file.id,
                tags: getFileTags(file),
                title: file.name,
                updatedAt: file.updatedAt,
                wordCount: content.split(/\s+/).length,
                workspacePath: maps.filePathById.get(file.id) ?? file.name,
              });
            } catch {}
          }
        }

        return {
          notes,
          operation,
          summary: `${operation} ${notes.length} note(s)`,
          task: input.task,
        };
      },
    }),
    log_misconception: tool({
      description:
        "Record a misconception only when the user explicitly reports a durable misunderstanding or the conversation clearly establishes a wrong mental model. Do not use it for normal questions, feature checks, or one-off clarifications.",
      inputSchema: chatToolSchemas.log_misconception.input,
      outputSchema: chatToolSchemas.log_misconception.output,
      execute: async (input) => {
        const misconception = await upsertMisconception({
          confidence: input.confidence,
          concept: input.concept,
          evidenceClass: "manual",
          reason: input.reason,
          source: "chat_tool",
          sourceSessionId: ctx.chatSlug,
          subject: input.subject,
          topic: input.topic,
          status: "confirmed",
          userId: ctx.userId,
          workspaceId: ctx.workspaceId,
        });
        const activeMisconceptions = await getActiveMisconceptions({
          concept: misconception.concept,
          subject: misconception.subject,
          topic: misconception.topic,
          userId: ctx.userId,
          workspaceId: ctx.workspaceId,
        });

        return {
          activeMisconceptionsCount: activeMisconceptions.length,
          misconception: mapMisconceptionForTool(misconception),
          summary: `Stored misconception for ${misconception.concept}`,
        };
      },
    }),
    list_misconceptions: tool({
      description:
        "List the current active misconceptions in the workspace. Use this before deciding whether to reinforce, resolve, or generate study material.",
      inputSchema: chatToolSchemas.list_misconceptions.input,
      outputSchema: chatToolSchemas.list_misconceptions.output,
      execute: async (input) => listMisconceptionsForTool(ctx, input),
    }),
    resolve_misconception: tool({
      description:
        "Mark a misconception as resolved after the user demonstrates understanding. Use after a correct explanation or a clean review streak.",
      inputSchema: chatToolSchemas.resolve_misconception.input,
      outputSchema: chatToolSchemas.resolve_misconception.output,
      execute: async (input) => resolveMisconceptionForTool(ctx, input),
    }),
    clear_misconception: tool({
      description:
        "Clear a misconception once it has been fully corrected. This is the explicit version of resolve_misconception.",
      inputSchema: chatToolSchemas.clear_misconception.input,
      outputSchema: chatToolSchemas.clear_misconception.output,
      execute: async (input) => resolveMisconceptionForTool(ctx, input),
    }),
    improve_misconception: tool({
      description:
        "List the current misconception first, then reduce the confidence of an active misconception after the user shows partial improvement.",
      inputSchema: chatToolSchemas.improve_misconception.input,
      outputSchema: chatToolSchemas.improve_misconception.output,
      execute: async (input) => improveMisconceptionForTool(ctx, input),
    }),
    generate_flashcards: tool({
      description:
        "Generate a persisted mindset set from a file, search query, or provided source text. Use only when the user explicitly asks for a mindset set, flashcards, mindset cards, or study cards.",
      inputSchema: chatToolSchemas.generate_flashcards.input,
      outputSchema: chatToolSchemas.generate_flashcards.output,
      execute: async (input) => generateFlashcardsFromSource(ctx, input),
    }),
    generate_flashcards_from_misconception: tool({
      description:
        "Generate a mindset set from an active misconception so the user can train the correct model directly.",
      inputSchema: chatToolSchemas.generate_flashcards_from_misconception.input,
      outputSchema:
        chatToolSchemas.generate_flashcards_from_misconception.output,
      execute: async (input) => generateFlashcardsFromMisconception(ctx, input),
    }),
    get_due_cards: tool({
      description:
        "Show how many study cards are due and preview the next due items. Use when the user asks about due cards or study progress, and also when the user is clearly struggling with a topic and you want to check whether relevant cards are due.",
      inputSchema: chatToolSchemas.get_due_cards.input,
      outputSchema: chatToolSchemas.get_due_cards.output,
      execute: async (input) => {
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
                  const taxonomy = normalizeFlashcardTaxonomy(
                    snapshot.card.source
                  );
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
      },
    }),
    quiz_me: tool({
      description:
        "Generate a persisted multiple choice quiz set from a file, query, or provided source text. Use only when the user explicitly asks for a quiz.",
      inputSchema: chatToolSchemas.quiz_me.input,
      outputSchema: chatToolSchemas.quiz_me.output,
      execute: async (input) => generateQuizFromSource(ctx, input),
    }),
    load_skill: tool({
      description:
        "Load a study-guideline skill into context. Use this before acting on structured study tasks like explanations, summaries, notes, mindset cards, or quizzes.",
      inputSchema: chatToolSchemas.load_skill.input,
      outputSchema: chatToolSchemas.load_skill.output,
      execute: async (input) => {
        const skills = input.skills.filter((skillName) =>
          AVAILABLE_STUDY_SKILLS.includes(
            skillName as (typeof AVAILABLE_STUDY_SKILLS)[number]
          )
        );
        if (skills.length === 0) {
          throw new Error("No valid skills provided for load_skill.");
        }
        return {
          content: loadSkills(skills),
          skills,
        };
      },
    }),
    visualize_read_me: tool({
      description:
        "Load visualization guidelines for widget generation. Call this before generating widgets to get detailed instructions for interactive HTML/CSS/SVG fragments.",
      inputSchema: chatToolSchemas.visualize_read_me.input,
      outputSchema: chatToolSchemas.visualize_read_me.output,
      execute: async (input) => {
        const modules = input.modules.filter((moduleName) =>
          AVAILABLE_VISUAL_SKILLS.includes(
            moduleName as (typeof AVAILABLE_VISUAL_SKILLS)[number]
          )
        );
        if (modules.length === 0) {
          throw new Error("No valid modules provided for visualize_read_me.");
        }
        return {
          content: loadSkills(modules),
          modules,
        };
      },
    }),
    show_widget: tool({
      description:
        "Render an interactive HTML/CSS/JS widget in the chat. Use for visualizations, diagrams, charts, simulations, and interactive explainers.",
      inputSchema: showWidgetInputSchema,
      outputSchema: chatToolSchemas.show_widget.output,
      execute: async (input) => {
        if (!input.i_have_seen_read_me) {
          throw new Error(
            "You must call visualize_read_me before show_widget."
          );
        }

        const widgetCode = input.widget_code ?? "";
        const isSVG = widgetCode.trimStart().startsWith("<svg");
        const width = input.width ?? 800;
        const height = input.height ?? 600;

        return {
          success: true,
          details: {
            title: input.title,
            width,
            height,
            isSVG,
          },
          widget_code: input.widget_code,
          widget_spec: input.widget_spec,
          filePath: null,
        };
      },
    }),
  };
}
