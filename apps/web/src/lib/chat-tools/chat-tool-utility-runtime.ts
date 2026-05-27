import {
  AVAILABLE_STUDY_SKILLS,
  AVAILABLE_VISUAL_SKILLS,
  loadSkills,
} from "@avenire/ai/skills";
import { tavily } from "@tavily/core";
import type { z } from "zod";

const DEFAULT_WEB_SEARCH_LIMIT = 5;

type WebSearchInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["web_search"]["input"]
>;
type LoadSkillInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["load_skill"]["input"]
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

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is required for web_search.");
  }

  const client = tavily({ apiKey });
  const response = await client.search(query, {
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
      content: result.content.trim(),
      favicon: result.favicon,
      publishedDate: result.publishedDate,
      score: result.score,
      title: result.title.trim(),
      url: result.url.trim(),
    })),
    totalResults: response.results.length,
  };
}

export async function executeLoadSkill(input: LoadSkillInput) {
  const skills = Array.from(
    new Set(
      input.skills
        .map((skillName) => skillName.trim())
        .filter((skillName) =>
          AVAILABLE_STUDY_SKILLS.includes(
            skillName as (typeof AVAILABLE_STUDY_SKILLS)[number]
          )
        )
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

export async function executeVisualizeReadMe(input: VisualizeReadMeInput) {
  const modules = Array.from(
    new Set(
      input.modules
        .map((moduleName) => moduleName.trim())
        .filter((moduleName) =>
          AVAILABLE_VISUAL_SKILLS.includes(
            moduleName as (typeof AVAILABLE_VISUAL_SKILLS)[number]
          )
        )
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
