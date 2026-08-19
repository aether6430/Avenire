import {
  AVAILABLE_STUDY_SKILLS,
  AVAILABLE_TEACHING_SKILLS,
  AVAILABLE_VISUAL_SKILLS,
  loadSkills,
} from "@avenire/ai/skills";
import {
  getTeachingArtifacts,
  saveTeachingArtifact,
  type TeachingArtifactKind,
} from "@avenire/database";
import { Firecrawl } from "firecrawl";
import { z } from "zod";

const DEFAULT_WEB_SEARCH_LIMIT = 5;

const FirecrawlSearchSchema = z.object({
  news: z
    .array(
      z.object({
        date: z.string().optional(),
        description: z.string().optional(),
        markdown: z.string().optional(),
        metadata: z
          .object({
            favicon: z.string().optional(),
          })
          .optional(),
        title: z.string(),
        url: z.string(),
      })
    )
    .optional(),
  web: z
    .array(
      z.object({
        description: z.string().optional(),
        markdown: z.string().optional(),
        metadata: z
          .object({
            favicon: z.string().optional(),
          })
          .optional(),
        title: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

type WebSearchInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["web_search"]["input"]
>;
type LoadSkillInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["load_skill"]["input"]
>;
type TeachingWorkspaceInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["get_teaching_workspace"]["input"]
>;
type SaveTeachingArtifactInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["save_teaching_artifact"]["input"]
>;
type VisualizeReadMeInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["visualize_read_me"]["input"]
>;
type ShowWidgetInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["show_widget"]["input"]
>;
type WidgetPayload = import("@avenire/ai/tools").WidgetPayload;

interface LegacyShowWidgetInput {
  filename?: string;
  height?: number;
  i_have_seen_read_me: boolean;
  title: string;
  widget_code?: string;
  width?: number;
}

function isWidgetPayload(value: unknown): value is WidgetPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<WidgetPayload>;

  if (payload.type === "code") {
    return typeof payload.code === "string" && payload.code.trim().length > 0;
  }

  if (payload.type === "spec") {
    return !!payload.spec;
  }

  return false;
}

export async function runWebSearch(input: WebSearchInput) {
  const query = input.query.trim();
  if (!query) {
    throw new Error("A web search query is required.");
  }

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is required for web_search.");
  }

  const client = new Firecrawl({
    apiKey,
    ...(process.env.FIRECRAWL_API_URL?.trim()
      ? { apiUrl: process.env.FIRECRAWL_API_URL.trim() }
      : {}),
  });
  const source = input.topic === "news" ? "news" : "web";
  const response = FirecrawlSearchSchema.parse(
    await client.search(query, {
      limit: input.maxResults ?? DEFAULT_WEB_SEARCH_LIMIT,
      sources: [source],
    })
  );
  const matches =
    source === "news" ? (response.news ?? []) : (response.web ?? []);

  return {
    query,
    results: matches.map((result, index) => ({
      content: (result.description ?? result.markdown ?? "").trim(),
      ...(result.metadata?.favicon ? { favicon: result.metadata.favicon } : {}),
      ...("date" in result && result.date
        ? { publishedDate: result.date }
        : {}),
      score: Math.max(0, 1 - index / Math.max(1, matches.length)),
      title: result.title.trim(),
      url: result.url.trim(),
    })),
    totalResults: matches.length,
  };
}

export async function executeLoadSkill(input: LoadSkillInput) {
  const skills = Array.from(
    new Set(
      input.skills.flatMap((skillName) => {
        const normalizedName = skillName.trim();
        return [...AVAILABLE_STUDY_SKILLS, ...AVAILABLE_TEACHING_SKILLS].some(
          (skill) => skill === normalizedName
        )
          ? [normalizedName]
          : [];
      })
    )
  );
  if (skills.length === 0) {
    throw new Error("No valid skills provided for load_skill.");
  }
  return {
    content: loadSkills(skills),
    skills,
  };
}

export async function executeGetTeachingWorkspace(
  ctx: { userId: string; workspaceId: string },
  input: TeachingWorkspaceInput
) {
  return getTeachingArtifacts({
    ...input,
    kind: input.kind as TeachingArtifactKind | undefined,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
}

export async function executeSaveTeachingArtifact(
  ctx: { userId: string; workspaceId: string },
  input: SaveTeachingArtifactInput
) {
  const artifact = await saveTeachingArtifact({
    ...input,
    kind: input.kind as TeachingArtifactKind,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
  return {
    artifact,
    summary: `Saved ${artifact.kind} "${artifact.title}" in the private teaching workspace.`,
  };
}

export async function executeVisualizeReadMe(input: VisualizeReadMeInput) {
  const modules = Array.from(
    new Set(
      input.modules.flatMap((moduleName) => {
        const normalizedName = moduleName.trim();
        return AVAILABLE_VISUAL_SKILLS.some((skill) => skill === normalizedName)
          ? [normalizedName]
          : [];
      })
    )
  );
  if (modules.length === 0) {
    throw new Error("No valid modules provided for visualize_read_me.");
  }
  return {
    content: loadSkills(modules),
    modules,
  };
}

function normalizeShowWidgetPayload(
  input: ShowWidgetInput | LegacyShowWidgetInput
): WidgetPayload {
  if ("widget" in input && isWidgetPayload(input.widget)) {
    const widget = input.widget;
    return widget.type === "code" && typeof widget.code === "string"
      ? {
          ...widget,
          code: widget.code.trim(),
        }
      : widget;
  }

  const legacyInput = input as Partial<LegacyShowWidgetInput>;
  const legacyCode = legacyInput.widget_code?.trim() ?? "";

  if (!legacyCode) {
    throw new Error("show_widget requires a non-empty widget payload.");
  }

  return {
    code: legacyCode,
    height: legacyInput.height,
    type: "code",
    width: legacyInput.width,
  };
}

export async function executeShowWidget(
  input: ShowWidgetInput | LegacyShowWidgetInput
) {
  return executeShowWidgetWithOptions(input);
}

export async function executeShowWidgetWithOptions(
  input: ShowWidgetInput | LegacyShowWidgetInput,
  options?: {
    chargeWidgetGeneration?: () => Promise<void>;
  }
) {
  if (!input.i_have_seen_read_me) {
    throw new Error("You must call visualize_read_me before show_widget.");
  }

  if (options?.chargeWidgetGeneration) {
    await options.chargeWidgetGeneration();
  }

  const widget = normalizeShowWidgetPayload(input);

  if (widget.type === "code") {
    const widgetCode = widget.code ?? "";
    const isSVG = widgetCode.trimStart().startsWith("<svg");

    return {
      success: true,
      details: {
        height: widget.height ?? 600,
        isSVG,
        mode: "code" as const,
        title: input.title,
        width: widget.width ?? 800,
      },
      widget,
    };
  }

  return {
    success: true,
    details: {
      height: widget.height,
      mode: "spec" as const,
      title: input.title,
      width: widget.width,
    },
    widget,
  };
}
