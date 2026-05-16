import { describe, expect, it } from "vitest";
import {
  filterSlashCommands,
  filterWikiPages,
  resolveActiveMenuIndex,
} from "@/components/editor/editor-command-menu-model";
import type { SlashCommand, WikiPage } from "@/components/editor-shared";

describe("editor command menu model", () => {
  it("filters slash commands across labels, descriptions, and keywords", () => {
    const commands: SlashCommand[] = [
      {
        id: "heading",
        label: "Heading 1",
        description: "Large section title",
        keywords: ["title", "#"],
        icon: (() => null) as SlashCommand["icon"],
        run: () => undefined,
      },
      {
        id: "math",
        label: "Inline Math",
        description: "Insert equation",
        keywords: ["latex", "$"],
        icon: (() => null) as SlashCommand["icon"],
        run: () => undefined,
      },
    ];

    expect(filterSlashCommands(commands, "")).toEqual(commands);
    expect(filterSlashCommands(commands, "title")).toEqual([commands[0]]);
    expect(filterSlashCommands(commands, "latex")).toEqual([commands[1]]);
  });

  it("filters wiki pages across title, excerpt, and content", () => {
    const pages: WikiPage[] = [
      {
        id: "one",
        title: "Vector Search",
        excerpt: "How retrieval works",
        content: "Embeddings and ranking",
      },
      {
        id: "two",
        title: "Task Flow",
        excerpt: "Daily planning",
        content: "Task capture and review",
      },
    ];

    expect(filterWikiPages(pages, "")).toEqual(pages);
    expect(filterWikiPages(pages, "retrieval")).toEqual([pages[0]]);
    expect(filterWikiPages(pages, "review")).toEqual([pages[1]]);
  });

  it("clamps active menu indices only when navigation belongs to the current match", () => {
    expect(
      resolveActiveMenuIndex({
        itemCount: 3,
        matchKey: "10:/hea",
        navIndex: 7,
        navKey: "10:/hea",
      })
    ).toBe(2);

    expect(
      resolveActiveMenuIndex({
        itemCount: 3,
        matchKey: "10:/hea",
        navIndex: 2,
        navKey: "other",
      })
    ).toBe(0);
  });
});
