import { type InferUITools, tool } from "ai";
import { z } from "zod";
import {
  AVAILABLE_STUDY_SKILLS,
  AVAILABLE_TEACHING_SKILLS,
  AVAILABLE_VISUAL_SKILLS,
} from "../skills";

const sourceTypeSchema = z
  .enum(["pdf", "image", "video", "audio", "document", "markdown", "link"])
  .optional();

const fileOperationResultSchema = z.object({
  fileId: z.string(),
  workspacePath: z.string(),
});

const citationSchema = z.object({
  chunkId: z.string(),
  endMs: z.number().int().nullable().optional(),
  fileId: z.string().nullable(),
  page: z.number().int().nullable().optional(),
  score: z.number(),
  snippet: z.string(),
  sourceType: z.string(),
  startMs: z.number().int().nullable().optional(),
  title: z.string().nullable().optional(),
  workspacePath: z.string(),
});

const dueCardSchema = z.object({
  cardId: z.string(),
  kind: z.enum(["flashcard", "multiple_choice_quiz"]),
  setId: z.string(),
  setTitle: z.string(),
  dueAt: z.string().nullable(),
  frontMarkdown: z.string(),
  remainingDueCount: z.number().int(),
});

const flashcardSchema = z.object({
  backMarkdown: z.string(),
  frontMarkdown: z.string(),
  notesMarkdown: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const quizQuestionSchema = z.object({
  backMarkdown: z.string(),
  correctOptionIndex: z.number().int().nonnegative(),
  explanation: z.string().nullable().optional(),
  frontMarkdown: z.string(),
  options: z.array(z.string()).min(2).max(8),
  tags: z.array(z.string()).optional(),
});

const agentFilePreviewSchema = z.object({
  excerpt: z.string(),
  fileId: z.string().nullable(),
  workspacePath: z.string(),
});

const notePreviewSchema = z.object({
  contentPreview: z.string(),
  fileId: z.string(),
  tags: z.array(z.string()).optional(),
  title: z.string(),
  updatedAt: z.string(),
  wordCount: z.number().int(),
  workspacePath: z.string(),
});

const webSearchResultSchema = z.object({
  content: z.string(),
  favicon: z.string().optional(),
  publishedDate: z.string().optional(),
  score: z.number(),
  title: z.string(),
  url: z.string().url(),
});

const misconceptionSchema = z.object({
  blocks: z
    .object({
      correctedMentalModel: z.string().optional(),
      explanation: z.string().optional(),
      summary: z.string().optional(),
    })
    .nullable()
    .optional(),
  confidence: z.number().min(0).max(1),
  concept: z.string(),
  createdAt: z.string(),
  reason: z.string(),
  resolvedAt: z.string().nullable(),
  source: z.string(),
  subject: z.string(),
  topic: z.string(),
  updatedAt: z.string(),
  workspaceId: z.string(),
});

const misconceptionScopeSchema = z.object({
  concept: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  subject: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
});

const teachingArtifactKindSchema = z.enum([
  "mission",
  "resource",
  "note",
  "reference",
  "lesson",
  "learning-record",
]);

const teachingArtifactSchema = z.object({
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
  kind: teachingArtifactKindSchema,
  slug: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});

const widgetToneSchema = z
  .enum(["default", "muted", "info", "success", "warning", "danger"])
  .optional();

const widgetTextWeightSchema = z.enum(["regular", "medium"]).optional();

const widgetChartSeriesSchema = z.object({
  dataKey: z.string().min(1),
  label: z.string().optional(),
  type: z.enum(["bar", "line", "area"]).optional(),
});

export const widgetSpecNodeSchema: z.ZodType<WidgetSpecNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("stack"),
      children: z.array(widgetSpecNodeSchema).min(1),
      gap: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
    }),
    z.object({
      type: z.literal("grid"),
      children: z.array(widgetSpecNodeSchema).min(1),
      columns: z.number().int().min(1).max(4).optional(),
      gap: z.enum(["xs", "sm", "md", "lg"]).optional(),
    }),
    z.object({
      type: z.literal("section"),
      children: z.array(widgetSpecNodeSchema).min(1),
      description: z.string().optional(),
      title: z.string().optional(),
    }),
    z.object({
      type: z.literal("card"),
      children: z.array(widgetSpecNodeSchema).optional(),
      description: z.string().optional(),
      title: z.string().optional(),
      tone: widgetToneSchema,
    }),
    z.object({
      type: z.literal("stat"),
      label: z.string().min(1),
      value: z.string().min(1),
      delta: z.string().optional(),
      tone: widgetToneSchema,
    }),
    z.object({
      type: z.literal("heading"),
      text: z.string().min(1),
      level: z.enum(["1", "2", "3"]).optional(),
    }),
    z.object({
      type: z.literal("text"),
      text: z.string().min(1),
      tone: widgetToneSchema,
      weight: widgetTextWeightSchema,
    }),
    z.object({
      type: z.literal("badge"),
      text: z.string().min(1),
      tone: widgetToneSchema,
    }),
    z.object({
      type: z.literal("callout"),
      children: z.array(widgetSpecNodeSchema).optional(),
      text: z.string().optional(),
      title: z.string().optional(),
      tone: widgetToneSchema,
    }),
    z.object({
      type: z.literal("table"),
      headers: z.array(z.string()).min(1).max(8),
      rows: z.array(z.array(z.string()).min(1)).min(1).max(40),
      caption: z.string().optional(),
    }),
    z.object({
      type: z.literal("chart"),
      chartType: z.enum(["bar", "line", "area"]).optional(),
      data: z
        .array(z.record(z.string(), z.union([z.string(), z.number()])))
        .min(1)
        .max(80),
      indexKey: z.string().min(1),
      series: z.array(widgetChartSeriesSchema).min(1).max(5),
      title: z.string().optional(),
    }),
    z.object({
      type: z.literal("progress"),
      label: z.string().optional(),
      value: z.number().min(0).max(100),
    }),
    z.object({
      type: z.literal("divider"),
    }),
    z.object({
      type: z.literal("code"),
      code: z.string().min(1),
      language: z.string().optional(),
    }),
    z.object({
      type: z.literal("html"),
      html: z.string().min(1),
    }),
  ])
);

export const widgetSpecSchema = z.object({
  root: widgetSpecNodeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
});

const widgetPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    code: z.string().min(1),
    height: z.number().optional(),
    type: z.literal("code"),
    width: z.number().optional(),
  }),
  z.object({
    height: z.number().optional(),
    spec: z.unknown(),
    type: z.literal("spec"),
    width: z.number().optional(),
  }),
]);

export type WidgetSpecNode =
  | {
      children: WidgetSpecNode[];
      gap?: "xs" | "sm" | "md" | "lg" | "xl";
      type: "stack";
    }
  | {
      children: WidgetSpecNode[];
      columns?: number;
      gap?: "xs" | "sm" | "md" | "lg";
      type: "grid";
    }
  | {
      children: WidgetSpecNode[];
      description?: string;
      title?: string;
      type: "section";
    }
  | {
      children?: WidgetSpecNode[];
      description?: string;
      title?: string;
      tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
      type: "card";
    }
  | {
      delta?: string;
      label: string;
      tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
      type: "stat";
      value: string;
    }
  | { level?: "1" | "2" | "3"; text: string; type: "heading" }
  | {
      text: string;
      tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
      type: "text";
      weight?: "regular" | "medium";
    }
  | {
      text: string;
      tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
      type: "badge";
    }
  | {
      children?: WidgetSpecNode[];
      text?: string;
      title?: string;
      tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
      type: "callout";
    }
  | { caption?: string; headers: string[]; rows: string[][]; type: "table" }
  | {
      chartType?: "bar" | "line" | "area";
      data: Record<string, string | number>[];
      indexKey: string;
      series: Array<{
        dataKey: string;
        label?: string;
        type?: "bar" | "line" | "area";
      }>;
      title?: string;
      type: "chart";
    }
  | { label?: string; type: "progress"; value: number }
  | { type: "divider" }
  | { code: string; language?: string; type: "code" }
  | { html: string; type: "html" };

export type WidgetSpec = z.infer<typeof widgetSpecSchema>;
export type WidgetPayload = z.infer<typeof widgetPayloadSchema>;

export const chatToolSchemas = {
  web_search: {
    input: z.object({
      includeAnswer: z.boolean().optional(),
      maxResults: z.number().int().min(1).max(10).optional(),
      query: z.string().min(1),
      topic: z.enum(["general", "news", "finance"]).optional(),
    }),
    output: z.object({
      answer: z.string().optional(),
      query: z.string(),
      results: z.array(webSearchResultSchema),
      totalResults: z.number().int(),
    }),
  },
  search_materials: {
    input: z.object({
      limit: z.number().int().min(1).max(20).optional(),
      mode: z.enum(["auto", "fast", "full"]).optional(),
      query: z.string().min(1),
      sourceType: sourceTypeSchema,
    }),
    output: z.object({
      citationMarkdown: z.string(),
      matches: z.array(citationSchema),
      query: z.string(),
      totalMatches: z.number().int(),
    }),
  },
  avenire_agent: {
    input: z.object({
      maxFiles: z.number().int().min(1).max(6).optional(),
      maxMatches: z.number().int().min(1).max(20).optional(),
      query: z.string().min(1),
    }),
    output: z.object({
      citationMarkdown: z.string(),
      citations: z.array(citationSchema),
      context: z.string(),
      files: z.array(agentFilePreviewSchema),
      query: z.string(),
      summary: z.string(),
    }),
  },
  file_manager_agent: {
    input: z.object({
      maxFiles: z.number().int().min(1).max(8).optional(),
      task: z.string().min(1),
    }),
    output: z.object({
      files: z.array(agentFilePreviewSchema),
      summary: z.string(),
      task: z.string(),
    }),
  },
  note_agent: {
    input: z.object({
      maxNotes: z.number().int().min(1).max(6).optional(),
      task: z.string().min(1),
    }),
    output: z.object({
      notes: z.array(notePreviewSchema),
      operation: z.enum(["created", "read", "updated", "listed"]),
      summary: z.string(),
      task: z.string(),
    }),
  },
  // --- Granular file operations (replacing file_manager_agent) ---
  list_files: {
    input: z.object({
      folderPath: z.string().optional(),
      maxResults: z.number().int().min(1).max(200).optional(),
    }),
    output: z.object({
      files: z.array(agentFilePreviewSchema),
      folders: z.array(
        z.object({
          folderId: z.string(),
          folderPath: z.string(),
          name: z.string(),
        })
      ),
      totalCount: z.number().int(),
    }),
  },
  read_file: {
    input: z.object({
      fileId: z.string().min(1),
      maxChars: z.number().int().min(100).max(50_000).optional(),
    }),
    output: z.object({
      content: z.string(),
      fileId: z.string(),
      mimeType: z.string().nullable(),
      workspacePath: z.string(),
    }),
  },
  move_file: {
    input: z.object({
      fileId: z.string().min(1),
      destinationFolderId: z.string().min(1),
    }),
    output: fileOperationResultSchema,
  },
  delete_file: {
    input: z.object({
      fileId: z.string().min(1),
    }),
    output: fileOperationResultSchema,
  },
  create_folder: {
    input: z.object({
      name: z.string().min(1),
      parentFolderId: z.string().optional(),
    }),
    output: z.object({
      folderId: z.string(),
      folderPath: z.string(),
    }),
  },
  get_file_info: {
    input: z.object({
      fileId: z.string().min(1),
    }),
    output: z.object({
      fileId: z.string(),
      mimeType: z.string().nullable(),
      updatedAt: z.string(),
      workspacePath: z.string(),
    }),
  },
  // --- Granular note operations (replacing note_agent) ---
  create_note: {
    input: z.object({
      content: z.string().min(1),
      folderPath: z.string().optional(),
      tags: z.array(z.string()).max(24).optional(),
      title: z.string().min(1).max(120),
    }),
    output: z.object({
      content: z.string(),
      fileId: z.string(),
      title: z.string(),
      workspacePath: z.string(),
    }),
  },
  read_note: {
    input: z.object({
      fileId: z.string().min(1),
    }),
    output: z.object({
      content: z.string(),
      contentSha256: z.string(),
      fileId: z.string(),
      tags: z.array(z.string()),
      title: z.string(),
      updatedAt: z.string(),
      wordCount: z.number().int(),
      workspacePath: z.string(),
    }),
  },
  update_note: {
    input: z.object({
      baseContentSha256: z.string().regex(/^[a-f0-9]{64}$/),
      changeSummary: z.string().max(280).optional(),
      content: z.string().min(1),
      fileId: z.string().min(1),
      mode: z.enum(["replace_entire", "append"]),
    }),
    output: z.object({
      content: z.string(),
      fileId: z.string(),
      previousContent: z.string(),
      title: z.string(),
      updatedAt: z.string(),
      workspacePath: z.string(),
    }),
  },
  list_notes: {
    input: z.object({
      maxNotes: z.number().int().min(1).max(50).optional(),
    }),
    output: z.object({
      notes: z.array(notePreviewSchema),
      totalCount: z.number().int(),
    }),
  },
  update_note_tags: {
    input: z.object({
      fileId: z.string().min(1),
      mode: z.enum(["replace", "add", "remove"]).optional(),
      tags: z.array(z.string()).max(24),
    }),
    output: z.object({
      fileId: z.string(),
      tags: z.array(z.string()),
    }),
  },
  generate_flashcards: {
    input: z
      .object({
        count: z.number().int().min(1).max(24).optional(),
        fileId: z.string().min(1).optional(),
        query: z.string().min(1).optional(),
        sourceText: z.string().min(1).optional(),
        tags: z.array(z.string()).max(12).optional(),
        title: z.string().min(1).optional(),
      })
      .refine((input) => input.fileId || input.query || input.sourceText, {
        message: "Provide fileId, query, or sourceText.",
      }),
    output: z.object({
      cards: z.array(flashcardSchema),
      setId: z.string(),
      title: z.string(),
    }),
  },
  get_due_cards: {
    input: z.object({
      concept: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(20).optional(),
      subject: z.string().min(1).optional(),
      topic: z.string().min(1).optional(),
    }),
    output: z.object({
      dueCards: z.array(dueCardSchema),
      totalDueCount: z.number().int(),
    }),
  },
  quiz_me: {
    input: z
      .object({
        count: z.number().int().min(3).max(5).optional(),
        fileId: z.string().min(1).optional(),
        query: z.string().min(1).optional(),
        sourceText: z.string().min(1).optional(),
        tags: z.array(z.string()).max(12).optional(),
        title: z.string().min(1).optional(),
      })
      .refine((input) => input.fileId || input.query || input.sourceText, {
        message: "Provide fileId, query, or sourceText.",
      }),
    output: z.object({
      questionCount: z.number().int(),
      questions: z.array(quizQuestionSchema),
      setId: z.string(),
      title: z.string(),
    }),
  },
  load_skill: {
    input: z.object({
      skills: z
        .array(
          z.enum(
            [...AVAILABLE_STUDY_SKILLS, ...AVAILABLE_TEACHING_SKILLS] as unknown as [
              string,
              ...string[],
            ]
          )
        )
        .min(1),
    }),
    output: z.object({
      content: z.string(),
      skills: z.array(z.string()),
    }),
  },
  get_teaching_workspace: {
    input: z.object({
      kind: teachingArtifactKindSchema.optional(),
      slug: z.string().min(1).optional(),
    }),
    output: z.object({
      artifacts: z.array(teachingArtifactSchema),
      mission: teachingArtifactSchema.nullable(),
    }),
  },
  save_teaching_artifact: {
    input: z.object({
      content: z.string().min(1),
      kind: teachingArtifactKindSchema,
      slug: z.string().min(1),
      title: z.string().min(1),
    }),
    output: z.object({
      artifact: teachingArtifactSchema,
      summary: z.string(),
    }),
  },
  visualize_read_me: {
    input: z.object({
      modules: z
        .array(
          z.enum(AVAILABLE_VISUAL_SKILLS as unknown as [string, ...string[]])
        )
        .min(1),
    }),
    output: z.object({
      content: z.string(),
      modules: z.array(z.string()),
    }),
  },
  log_misconception: {
    input: z.object({
      blocks: z
        .object({
          correctedMentalModel: z.string().min(1),
          explanation: z.string().min(1),
          summary: z.string().min(1),
        })
        .optional(),
      confidence: z.number().min(0).max(1),
      concept: z.string().min(1),
      reason: z.string().min(1),
      subject: z.string().min(1),
      topic: z.string().min(1),
    }),
    output: z.object({
      activeMisconceptionsCount: z.number().int(),
      misconception: misconceptionSchema,
      summary: z.string(),
    }),
  },
  list_misconceptions: {
    input: misconceptionScopeSchema,
    output: z.object({
      count: z.number().int(),
      misconceptions: z.array(misconceptionSchema),
      summary: z.string(),
    }),
  },
  resolve_misconception: {
    input: z.object({
      concept: z.string().min(1),
      subject: z.string().min(1),
      topic: z.string().min(1),
    }),
    output: z.object({
      remainingActiveCount: z.number().int(),
      resolvedCount: z.number().int(),
      summary: z.string(),
    }),
  },
  clear_misconception: {
    input: z.object({
      concept: z.string().min(1),
      subject: z.string().min(1),
      topic: z.string().min(1),
    }),
    output: z.object({
      remainingActiveCount: z.number().int(),
      resolvedCount: z.number().int(),
      summary: z.string(),
    }),
  },
  improve_misconception: {
    input: z.object({
      concept: z.string().min(1),
      decay: z.number().min(0).max(0.5).optional(),
      resolveThreshold: z.number().min(0).max(0.9).optional(),
      subject: z.string().min(1),
      topic: z.string().min(1),
    }),
    output: z.object({
      improvedCount: z.number().int(),
      remainingActiveCount: z.number().int(),
      resolvedCount: z.number().int(),
      summary: z.string(),
    }),
  },
  generate_flashcards_from_misconception: {
    input: z.object({
      count: z.number().int().min(1).max(24).optional(),
      concept: z.string().min(1),
      reason: z.string().min(1),
      subject: z.string().min(1),
      tags: z.array(z.string()).max(12).optional(),
      topic: z.string().min(1),
      title: z.string().min(1).optional(),
    }),
    output: z.object({
      cards: z.array(flashcardSchema),
      setId: z.string(),
      title: z.string(),
    }),
  },
  show_widget: {
    input: z.object({
      i_have_seen_read_me: z.boolean(),
      title: z.string(),
      widget: widgetPayloadSchema,
    }),
    output: z.object({
      success: z.boolean(),
      details: z
        .object({
          mode: z.enum(["spec", "code"]),
          title: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
          isSVG: z.boolean().optional(),
        })
        .optional(),
      widget: widgetPayloadSchema.optional(),
    }),
  },
} as const;

export const chatTools = {
  web_search: tool({
    inputSchema: chatToolSchemas.web_search.input,
    outputSchema: chatToolSchemas.web_search.output,
  }),
  search_materials: tool({
    inputSchema: chatToolSchemas.search_materials.input,
    outputSchema: chatToolSchemas.search_materials.output,
  }),
  avenire_agent: tool({
    inputSchema: chatToolSchemas.avenire_agent.input,
    outputSchema: chatToolSchemas.avenire_agent.output,
  }),
  file_manager_agent: tool({
    inputSchema: chatToolSchemas.file_manager_agent.input,
    outputSchema: chatToolSchemas.file_manager_agent.output,
  }),
  note_agent: tool({
    inputSchema: chatToolSchemas.note_agent.input,
    outputSchema: chatToolSchemas.note_agent.output,
  }),
  list_files: tool({
    inputSchema: chatToolSchemas.list_files.input,
    outputSchema: chatToolSchemas.list_files.output,
  }),
  read_file: tool({
    inputSchema: chatToolSchemas.read_file.input,
    outputSchema: chatToolSchemas.read_file.output,
  }),
  move_file: tool({
    inputSchema: chatToolSchemas.move_file.input,
    outputSchema: chatToolSchemas.move_file.output,
  }),
  delete_file: tool({
    inputSchema: chatToolSchemas.delete_file.input,
    outputSchema: chatToolSchemas.delete_file.output,
  }),
  create_folder: tool({
    inputSchema: chatToolSchemas.create_folder.input,
    outputSchema: chatToolSchemas.create_folder.output,
  }),
  get_file_info: tool({
    inputSchema: chatToolSchemas.get_file_info.input,
    outputSchema: chatToolSchemas.get_file_info.output,
  }),
  create_note: tool({
    inputSchema: chatToolSchemas.create_note.input,
    outputSchema: chatToolSchemas.create_note.output,
  }),
  read_note: tool({
    inputSchema: chatToolSchemas.read_note.input,
    outputSchema: chatToolSchemas.read_note.output,
  }),
  update_note: tool({
    inputSchema: chatToolSchemas.update_note.input,
    outputSchema: chatToolSchemas.update_note.output,
  }),
  list_notes: tool({
    inputSchema: chatToolSchemas.list_notes.input,
    outputSchema: chatToolSchemas.list_notes.output,
  }),
  update_note_tags: tool({
    inputSchema: chatToolSchemas.update_note_tags.input,
    outputSchema: chatToolSchemas.update_note_tags.output,
  }),
  generate_flashcards: tool({
    inputSchema: chatToolSchemas.generate_flashcards.input,
    outputSchema: chatToolSchemas.generate_flashcards.output,
  }),
  get_due_cards: tool({
    inputSchema: chatToolSchemas.get_due_cards.input,
    outputSchema: chatToolSchemas.get_due_cards.output,
  }),
  quiz_me: tool({
    inputSchema: chatToolSchemas.quiz_me.input,
    outputSchema: chatToolSchemas.quiz_me.output,
  }),
  load_skill: tool({
    inputSchema: chatToolSchemas.load_skill.input,
    outputSchema: chatToolSchemas.load_skill.output,
  }),
  get_teaching_workspace: tool({
    inputSchema: chatToolSchemas.get_teaching_workspace.input,
    outputSchema: chatToolSchemas.get_teaching_workspace.output,
  }),
  save_teaching_artifact: tool({
    inputSchema: chatToolSchemas.save_teaching_artifact.input,
    outputSchema: chatToolSchemas.save_teaching_artifact.output,
  }),
  visualize_read_me: tool({
    inputSchema: chatToolSchemas.visualize_read_me.input,
    outputSchema: chatToolSchemas.visualize_read_me.output,
  }),
  log_misconception: tool({
    inputSchema: chatToolSchemas.log_misconception.input,
    outputSchema: chatToolSchemas.log_misconception.output,
  }),
  list_misconceptions: tool({
    inputSchema: chatToolSchemas.list_misconceptions.input,
    outputSchema: chatToolSchemas.list_misconceptions.output,
  }),
  resolve_misconception: tool({
    inputSchema: chatToolSchemas.resolve_misconception.input,
    outputSchema: chatToolSchemas.resolve_misconception.output,
  }),
  clear_misconception: tool({
    inputSchema: chatToolSchemas.clear_misconception.input,
    outputSchema: chatToolSchemas.clear_misconception.output,
  }),
  improve_misconception: tool({
    inputSchema: chatToolSchemas.improve_misconception.input,
    outputSchema: chatToolSchemas.improve_misconception.output,
  }),
  generate_flashcards_from_misconception: tool({
    inputSchema: chatToolSchemas.generate_flashcards_from_misconception.input,
    outputSchema: chatToolSchemas.generate_flashcards_from_misconception.output,
  }),
  show_widget: tool({
    inputSchema: chatToolSchemas.show_widget.input,
    outputSchema: chatToolSchemas.show_widget.output,
  }),
};

export type ChatUITools = InferUITools<typeof chatTools>;
