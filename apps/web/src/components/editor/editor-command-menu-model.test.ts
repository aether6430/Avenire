import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSlashCommands,
  filterSlashCommands,
  filterWikiPages,
  resolveActiveMenuIndex,
  resolveAiTarget,
} from "@/components/editor/editor-command-menu-model";
import type { SlashCommand, WikiPage } from "@/components/editor-shared";

const originalFetch = globalThis.fetch;

describe("editor command menu model", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

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

  it("resolves AI targets from the active selection before falling back to block text", () => {
    const editor = {
      state: {
        selection: {
          empty: false,
          from: 5,
          to: 18,
          $from: {
            parent: {
              isTextblock: true,
              textContent: "Ignored current block",
            },
            end: () => 24,
            start: () => 1,
          },
        },
        doc: {
          nodesBetween: vi.fn(),
          textBetween: vi.fn(() => " Selected text "),
        },
      },
    } as never;

    expect(resolveAiTarget(editor)).toEqual({
      from: 5,
      to: 18,
      text: " Selected text ",
    });
  });

  it("runs AI slash actions through /api/ai and replaces the selected text", async () => {
    const chain = {
      deleteRange: vi.fn(() => chain),
      focus: vi.fn(() => chain),
      insertContentAt: vi.fn(() => chain),
      run: vi.fn(),
      setTextSelection: vi.fn(() => chain),
    };
    const editor = {
      chain: vi.fn(() => chain),
      state: {
        selection: {
          empty: false,
          from: 5,
          to: 18,
          $from: {
            parent: {
              isTextblock: true,
              textContent: "Ignored current block",
            },
            end: () => 24,
            start: () => 1,
          },
        },
        doc: {
          nodesBetween: vi.fn(),
          textBetween: vi.fn(() => " Selected text "),
        },
      },
    } as never;

    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ text: "Simplified text" }),
      ok: true,
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const setAiLoading = vi.fn();
    const setAiReview = vi.fn();
    const setImagePopover = vi.fn();
    const setInlineNotice = vi.fn();
    const setMermaidPopover = vi.fn();

    const commands = createSlashCommands({
      aiLoading: null,
      editor,
      openMathEditor: vi.fn(),
      setAiLoading,
      setAiReview,
      setImagePopover,
      setInlineNotice,
      setMermaidPopover,
    });

    const simplifyCommand = commands.find(
      (command) => command.id === "ai-simplify"
    );

    expect(simplifyCommand).toBeTruthy();
    await simplifyCommand?.run({ match: null });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai", {
      body: JSON.stringify({
        action: "simplify",
        text: " Selected text ",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(chain.deleteRange).toHaveBeenCalledWith({ from: 5, to: 18 });
    expect(chain.insertContentAt).toHaveBeenCalledWith(5, "Simplified text");
    expect(chain.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 20 });
    expect(setAiReview).toHaveBeenCalledWith({
      from: 5,
      generatedLength: 15,
      original: " Selected text ",
    });
    expect(setInlineNotice).not.toHaveBeenCalled();
    expect(setAiLoading).toHaveBeenNthCalledWith(1, "simplify");
    expect(setAiLoading).toHaveBeenLastCalledWith(null);
  });

  it("surfaces route-provided AI error messages instead of collapsing everything to a generic notice", async () => {
    const chain = {
      deleteRange: vi.fn(() => chain),
      focus: vi.fn(() => chain),
      insertContentAt: vi.fn(() => chain),
      run: vi.fn(),
      setTextSelection: vi.fn(() => chain),
    };
    const editor = {
      chain: vi.fn(() => chain),
      state: {
        selection: {
          empty: false,
          from: 5,
          to: 18,
          $from: {
            parent: {
              isTextblock: true,
              textContent: "Ignored current block",
            },
            end: () => 24,
            start: () => 1,
          },
        },
        doc: {
          nodesBetween: vi.fn(),
          textBetween: vi.fn(() => " Selected text "),
        },
      },
    } as never;

    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: "AI credits exhausted" }),
      ok: false,
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const setAiLoading = vi.fn();
    const setAiReview = vi.fn();
    const setImagePopover = vi.fn();
    const setInlineNotice = vi.fn();
    const setMermaidPopover = vi.fn();

    const commands = createSlashCommands({
      aiLoading: null,
      editor,
      openMathEditor: vi.fn(),
      setAiLoading,
      setAiReview,
      setImagePopover,
      setInlineNotice,
      setMermaidPopover,
    });

    const explainCommand = commands.find(
      (command) => command.id === "ai-explain"
    );

    expect(explainCommand).toBeTruthy();
    await explainCommand?.run({ match: null });

    expect(setInlineNotice).toHaveBeenCalledWith("AI credits exhausted");
    expect(chain.deleteRange).not.toHaveBeenCalled();
    expect(setAiReview).not.toHaveBeenCalled();
    expect(setAiLoading).toHaveBeenNthCalledWith(1, "explain");
    expect(setAiLoading).toHaveBeenLastCalledWith(null);
  });
});
