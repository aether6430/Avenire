import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadSkillsMock, searchMock, tavilyMock } = vi.hoisted(() => ({
  loadSkillsMock: vi.fn(),
  searchMock: vi.fn(),
  tavilyMock: vi.fn(),
}));

vi.mock("@avenire/ai/skills", () => ({
  AVAILABLE_STUDY_SKILLS: ["explain", "summarize"],
  AVAILABLE_VISUAL_SKILLS: ["diagram", "chart"],
  loadSkills: loadSkillsMock,
}));

vi.mock("@tavily/core", () => ({
  tavily: tavilyMock,
}));

import {
  executeLoadSkill,
  executeShowWidget,
  executeVisualizeReadMe,
  runWebSearch,
} from "@/lib/chat-tools/chat-tool-utility-runtime";

describe("chat tool utility runtime", () => {
  beforeEach(() => {
    loadSkillsMock.mockReset();
    searchMock.mockReset();
    tavilyMock.mockReset();
  });

  it("runs web search through tavily", async () => {
    const env = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = "test-key";
    tavilyMock.mockReturnValue({ search: searchMock });
    searchMock.mockResolvedValue({
      answer: "Momentum is conserved.",
      query: "momentum",
      results: [
        {
          content: "Momentum summary",
          favicon: "https://example.com/favicon.ico",
          publishedDate: "2026-05-17",
          score: 0.9,
          title: "Momentum",
          url: "https://example.com/momentum",
        },
      ],
    });

    const result = await runWebSearch({ query: "momentum" } as never);

    expect(result.totalResults).toBe(1);
    expect(result.answer).toContain("Momentum");
    process.env.TAVILY_API_KEY = env;
  });

  it("loads study and visual skills through the shared skill loader", async () => {
    loadSkillsMock.mockReturnValue("loaded skill text");

    const study = await executeLoadSkill({
      skills: ["explain", "ignored"],
    } as never);
    expect(study.skills).toEqual(["explain"]);

    const visual = await executeVisualizeReadMe({
      modules: ["diagram", "ignored"],
    } as never);
    expect(visual.modules).toEqual(["diagram"]);
    expect(loadSkillsMock).toHaveBeenCalledTimes(2);
  });

  it("renders widget metadata and blocks calls before read me", async () => {
    await expect(
      executeShowWidget({
        i_have_seen_read_me: false,
      } as never)
    ).rejects.toThrow("visualize_read_me");

    const result = await executeShowWidget({
      height: 480,
      i_have_seen_read_me: true,
      title: "Momentum diagram",
      widget_code: "<svg></svg>",
      width: 640,
    } as never);

    expect(result.success).toBe(true);
    expect(result.details.isSVG).toBe(true);
    expect(result.details.width).toBe(640);
  });
});
