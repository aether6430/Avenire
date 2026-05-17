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

export async function runWebSearch(input: WebSearchInput) {
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

export async function executeLoadSkill(input: LoadSkillInput) {
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
}

export async function executeVisualizeReadMe(input: VisualizeReadMeInput) {
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
}

export async function executeShowWidget(input: ShowWidgetInput) {
  if (!input.i_have_seen_read_me) {
    throw new Error("You must call visualize_read_me before show_widget.");
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
}
