import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadSkillsMock, searchMock } = vi.hoisted(() => ({
  loadSkillsMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock("@avenire/ai/skills", () => ({
  AVAILABLE_STUDY_SKILLS: ["explain", "summarize"],
  AVAILABLE_VISUAL_SKILLS: ["diagram", "chart"],
  loadSkills: loadSkillsMock,
}));

vi.mock("firecrawl", () => ({
  Firecrawl: class {
    search = searchMock;
  },
}));

import {
  executeLoadSkill,
  executeShowWidget,
  executeShowWidgetWithOptions,
  executeVisualizeReadMe,
  runWebSearch,
} from "@/lib/chat-tools/chat-tool-utility-runtime";

describe("chat tool utility runtime", () => {
  beforeEach(() => {
    loadSkillsMock.mockReset();
    searchMock.mockReset();
  });

  it("runs web search through Firecrawl", async () => {
    const env = process.env.FIRECRAWL_API_KEY;
    process.env.FIRECRAWL_API_KEY = "test-key";
    searchMock.mockResolvedValue({
      web: [
        {
          description: "  Momentum summary  ",
          metadata: {
            favicon: "https://example.com/favicon.ico",
          },
          title: "  Momentum  ",
          url: "https://example.com/momentum  ",
        },
      ],
    });

    const result = await runWebSearch({ query: "momentum" } as never);

    expect(result.totalResults).toBe(1);
    expect(result.results[0]).toMatchObject({
      content: "Momentum summary",
      score: 1,
      title: "Momentum",
      url: "https://example.com/momentum",
    });

    await expect(runWebSearch({ query: "   " } as never)).rejects.toThrow(
      "A web search query is required."
    );
    expect(searchMock).toHaveBeenCalledTimes(1);
    process.env.FIRECRAWL_API_KEY = env;
  });

  it("loads study and visual skills through the shared skill loader", async () => {
    loadSkillsMock.mockReturnValue("loaded skill text");

    const study = await executeLoadSkill({
      skills: [" explain ", "ignored", "explain"],
    } as never);
    expect(study.skills).toEqual(["explain"]);

    const visual = await executeVisualizeReadMe({
      modules: [" diagram ", "ignored", "diagram"],
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
      i_have_seen_read_me: true,
      title: "Momentum diagram",
      widget: {
        code: "<svg></svg>",
        height: 480,
        type: "code",
        width: 640,
      },
    } as never);

    expect(result.success).toBe(true);
    expect(result.details.mode).toBe("code");
    expect(result.details.isSVG).toBe(true);
    expect(result.details.width).toBe(640);
    expect(result.widget).toEqual({
      code: "<svg></svg>",
      height: 480,
      type: "code",
      width: 640,
    });

    await expect(
      executeShowWidget({
        i_have_seen_read_me: true,
        title: "Legacy diagram",
        widget_code: "<svg></svg>",
      } as never)
    ).resolves.toMatchObject({
      details: {
        mode: "code",
      },
      widget: {
        code: "<svg></svg>",
        type: "code",
      },
    });

    await expect(
      executeShowWidget({
        i_have_seen_read_me: true,
        title: "Broken legacy widget",
        widget_code: "   ",
      } as never)
    ).rejects.toThrow("show_widget requires a non-empty widget payload.");

    await expect(
      executeShowWidget({
        i_have_seen_read_me: true,
        title: "Broken typed widget",
        widget: {
          code: "   ",
          type: "code",
        },
      } as never)
    ).rejects.toThrow("show_widget requires a non-empty widget payload.");
  });

  it("charges widget generation through the optional callback when provided", async () => {
    const chargeWidgetGeneration = vi.fn(async () => undefined);

    await executeShowWidgetWithOptions(
      {
        i_have_seen_read_me: true,
        title: "Momentum diagram",
        widget: {
          code: "<svg></svg>",
          type: "code",
        },
      } as never,
      { chargeWidgetGeneration }
    );

    expect(chargeWidgetGeneration).toHaveBeenCalledTimes(1);
  });
});
