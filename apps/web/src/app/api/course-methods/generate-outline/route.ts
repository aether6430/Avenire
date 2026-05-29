import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildCourseOutline,
  parseCourseSubtopics,
  type CourseOutlineSource,
} from "@/lib/course-outline-generation";
import { runWebSearch } from "@/lib/chat-tools/chat-tool-utility-runtime";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

const generateOutlineSchema = z.object({
  docText: z.string().trim().max(12_000).optional(),
  exam: z.string().trim().max(120).optional(),
  subtopics: z.string().trim().max(4000).optional(),
  topic: z.string().trim().min(1).max(160),
  useWorkspace: z.boolean().default(true),
  useWeb: z.boolean().default(true),
});

function sourceLabelFromMetadata(metadata: Record<string, unknown>) {
  const filename = metadata.filename;
  const path = metadata.path;
  if (typeof filename === "string" && filename.trim()) {
    return filename.trim();
  }
  if (typeof path === "string" && path.trim()) {
    return path.trim();
  }
  return "Workspace source";
}

async function collectWorkspaceSources(input: {
  query: string;
  userId: string;
  workspaceId: string;
}) {
  const result = await retrieveWorkspaceChunksShared({
    limit: 6,
    mode: "auto",
    origin: "api",
    query: input.query,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  return result.results.map(
    (chunk): CourseOutlineSource => ({
      content: chunk.content,
      kind: "workspace",
      label: sourceLabelFromMetadata(chunk.metadata),
      score: chunk.rerankScore,
    })
  );
}

async function collectWebSources(query: string) {
  const result = await runWebSearch({
    includeAnswer: true,
    maxResults: 6,
    query: `${query} syllabus revision topic breakdown`,
    topic: "general",
  });

  const answerSource: CourseOutlineSource[] = result.answer
    ? [
        {
          content: result.answer,
          kind: "web",
          label: "Web search summary",
          score: 1,
        },
      ]
    : [];

  return [
    ...answerSource,
    ...result.results.map(
      (item): CourseOutlineSource => ({
        content: item.content,
        kind: "web",
        label: item.title,
        score: item.score,
        url: item.url,
      })
    ),
  ];
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = generateOutlineSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid outline payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const query = [parsed.data.exam, parsed.data.topic]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  const sourceResults = await Promise.allSettled([
    parsed.data.useWorkspace
      ? collectWorkspaceSources({
          query,
          userId: ctx.user.id,
          workspaceId: ctx.workspace.workspaceId,
        })
      : Promise.resolve([]),
    parsed.data.useWeb ? collectWebSources(query) : Promise.resolve([]),
  ]);

  const manualSources: CourseOutlineSource[] = parsed.data.docText
    ? [
        {
          content: parsed.data.docText,
          kind: "manual",
          label: "Pasted course material",
          score: 1,
        },
      ]
    : [];
  const sources = [
    ...manualSources,
    ...sourceResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    ),
  ];
  const sourceErrors = sourceResults.flatMap((result) =>
    result.status === "rejected"
      ? [
          result.reason instanceof Error
            ? result.reason.message
            : "Search failed",
        ]
      : []
  );

  const outline = buildCourseOutline({
    exam: parsed.data.exam,
    explicitSubtopics: parseCourseSubtopics(parsed.data.subtopics ?? ""),
    sources,
    topic: parsed.data.topic,
  });

  return NextResponse.json({
    outline,
    sourceErrors,
  });
}
