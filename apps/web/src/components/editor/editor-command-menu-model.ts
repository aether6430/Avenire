"use client";

import {
  Code,
  TextHOne as Heading1,
  TextHTwo as Heading2,
  TextHThree as Heading3,
  ImageIcon,
  List,
  ListNumbers as ListOrdered,
  ListChecks as ListTodo,
  Minus,
  Paragraph as Pilcrow,
  Quotes as Quote,
  Sigma,
  Table as Table2,
  FlowArrow as Workflow,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import type { Dispatch, SetStateAction } from "react";
import {
  type AiAction,
  clamp,
  getImagePickerTab,
  type ImagePopoverState,
  type MathKind,
  MERMAID_DEFAULT,
  type MermaidPopoverState,
  type SlashCommand,
  type WikiPage,
} from "@/components/editor/editor-core";

export function resolveAiTarget(editor: Editor) {
  const { selection, doc } = editor.state;

  if (!selection.empty) {
    const selected = doc.textBetween(selection.from, selection.to, "\n", "\n");
    if (selected.trim()) {
      return {
        from: selection.from,
        to: selection.to,
        text: selected,
      };
    }
  }

  const { $from } = selection;
  const currentBlockText = $from.parent.textContent;
  if ($from.parent.isTextblock && currentBlockText.trim()) {
    return {
      from: $from.start(),
      to: $from.end(),
      text: currentBlockText,
    };
  }

  let candidate: { from: number; to: number; text: string } | null = null;
  doc.nodesBetween(0, selection.from, (node, pos) => {
    if (!node.isTextblock) {
      return;
    }
    const text = node.textContent.trim();
    if (!text) {
      return;
    }
    candidate = {
      from: pos + 1,
      to: pos + node.nodeSize - 1,
      text: node.textContent,
    };
  });

  return candidate;
}

export function createSlashCommands({
  aiLoading,
  editor,
  openMathEditor,
  setAiLoading,
  setAiReview,
  setImagePopover,
  setInlineNotice,
  setMermaidPopover,
}: {
  aiLoading: AiAction | null;
  editor: Editor;
  openMathEditor: (editor: Editor, kind: MathKind, pos: number) => void;
  setAiLoading: Dispatch<SetStateAction<AiAction | null>>;
  setAiReview: Dispatch<
    SetStateAction<{
      from: number;
      generatedLength: number;
      original: string;
    } | null>
  >;
  setImagePopover: Dispatch<SetStateAction<ImagePopoverState | null>>;
  setInlineNotice: Dispatch<SetStateAction<string | null>>;
  setMermaidPopover: Dispatch<SetStateAction<MermaidPopoverState | null>>;
}): SlashCommand[] {
  const runAiAction = async (action: AiAction) => {
    const target = resolveAiTarget(editor);

    if (!target) {
      setInlineNotice("No text found to transform in this context.");
      return;
    }

    const source = target.text;

    if (!source.trim()) {
      setInlineNotice("No text found to transform in this context.");
      return;
    }

    setAiLoading(action);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: source }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const payload = (await response.json()) as { text?: string };
      const generated = payload.text?.trim();

      if (!generated) {
        throw new Error("No text generated");
      }

      const from = target.from;

      editor
        .chain()
        .focus()
        .deleteRange({ from: target.from, to: target.to })
        .insertContentAt(from, generated)
        .setTextSelection({ from, to: from + generated.length })
        .run();

      setAiReview({
        from,
        generatedLength: generated.length,
        original: source,
      });
    } catch {
      setInlineNotice("Could not generate text right now.");
    } finally {
      setAiLoading(null);
    }
  };

  const focusAndOpenMath = (kind: MathKind, latex: string) => {
    const pos = editor.state.selection.from;

    if (kind === "inlineMath") {
      editor.chain().focus().insertInlineMath({ latex, pos }).run();
    } else {
      editor.chain().focus().insertBlockMath({ latex, pos }).run();
    }

    requestAnimationFrame(() => {
      openMathEditor(editor, kind, pos);
    });
  };

  return [
    {
      id: "text",
      label: "Text",
      description: "Plain paragraph",
      icon: Pilcrow,
      keywords: ["paragraph", "p"],
      run: () => editor.chain().focus().setParagraph().run(),
    },
    {
      id: "h1",
      label: "Heading 1",
      description: "Large section title",
      icon: Heading1,
      keywords: ["title", "#"],
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      label: "Heading 2",
      description: "Medium heading",
      icon: Heading2,
      keywords: ["subtitle", "##"],
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      label: "Heading 3",
      description: "Small heading",
      icon: Heading3,
      keywords: ["###"],
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: "bullet",
      label: "Bullet List",
      description: "Create an unordered list",
      icon: List,
      keywords: ["list", "-", "ul"],
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: "ordered",
      label: "Numbered List",
      description: "Create an ordered list",
      icon: ListOrdered,
      keywords: ["list", "1.", "ol"],
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "task",
      label: "To-do List",
      description: "Track tasks with checkboxes",
      icon: ListTodo,
      keywords: ["task", "checkbox", "[]"],
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      id: "quote",
      label: "Quote",
      description: "Blockquote",
      icon: Quote,
      keywords: [">", "blockquote"],
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "code",
      label: "Code Block",
      description: "Multiline code snippet",
      icon: Code,
      keywords: ["```", "pre"],
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "image",
      label: "Image",
      description: "Insert image from URL",
      icon: ImageIcon,
      keywords: ["image", "photo", "picture"],
      run: () => {
        const previous =
          (editor.getAttributes("image").src as string | undefined) ?? "";
        const pos = editor.state.selection.from;
        setImagePopover({
          pos,
          src: previous,
          tab: getImagePickerTab(previous),
        });
      },
    },
    {
      id: "divider",
      label: "Divider",
      description: "Horizontal rule",
      icon: Minus,
      keywords: ["hr", "---"],
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "inline-math",
      label: "Inline Math",
      description: "Insert $...$ math",
      icon: Sigma,
      keywords: ["math", "latex", "$"],
      run: () => focusAndOpenMath("inlineMath", "x^2"),
    },
    {
      id: "block-math",
      label: "Block Equation",
      description: "Insert $$...$$ equation",
      icon: Sigma,
      keywords: ["math", "equation", "$$"],
      run: () => focusAndOpenMath("blockMath", "\\sum_{i=1}^{n} x_i"),
    },
    {
      id: "mermaid",
      label: "Mermaid Diagram",
      description: "Flowchart, sequence diagram, etc.",
      icon: Workflow,
      keywords: ["mermaid", "diagram", "flowchart", "chart"],
      run: () => {
        const pos = editor.state.selection.from;
        (
          editor.chain().focus() as unknown as {
            insertMermaidDiagram: (o: { pos: number }) => { run: () => void };
          }
        )
          .insertMermaidDiagram({ pos })
          .run();
        requestAnimationFrame(() => {
          const node = editor.state.doc.nodeAt(pos);
          if (node?.type.name === "mermaidDiagram") {
            setMermaidPopover({
              pos,
              draft: String(
                (node.attrs as { code?: string }).code ?? MERMAID_DEFAULT
              ),
            });
          }
        });
      },
    },
    {
      id: "table",
      label: "Table",
      description: "Insert a 3x3 table with headers",
      icon: Table2,
      keywords: ["table", "grid", "|"],
      run: () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      id: "ai-explain",
      label: "/explain",
      description:
        aiLoading === "explain" ? "Generating..." : "Explain selected text",
      icon: Sigma,
      keywords: ["explain", "ai"],
      run: () => runAiAction("explain"),
    },
    {
      id: "ai-elaborate",
      label: "/elaborate",
      description:
        aiLoading === "elaborate" ? "Generating..." : "Elaborate selected text",
      icon: Sigma,
      keywords: ["elaborate", "ai", "expand"],
      run: () => runAiAction("elaborate"),
    },
    {
      id: "ai-simplify",
      label: "/simplify",
      description:
        aiLoading === "simplify" ? "Generating..." : "Simplify selected text",
      icon: Sigma,
      keywords: ["simplify", "ai"],
      run: () => runAiAction("simplify"),
    },
  ];
}

export function filterSlashCommands(
  slashCommands: SlashCommand[],
  query: string
) {
  if (!query) {
    return slashCommands;
  }

  return slashCommands.filter((command) => {
    const haystack = [command.label, command.description, ...command.keywords]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function filterWikiPages(wikiPages: WikiPage[], query: string) {
  if (!query) {
    return wikiPages;
  }

  return wikiPages.filter((page) => {
    const haystack =
      `${page.title} ${page.excerpt} ${page.content}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function resolveActiveMenuIndex({
  itemCount,
  matchKey,
  navIndex,
  navKey,
}: {
  itemCount: number;
  matchKey: string | null;
  navIndex: number;
  navKey: string | null;
}) {
  if (!(matchKey && navKey === matchKey)) {
    return 0;
  }

  return clamp(navIndex, 0, Math.max(itemCount - 1, 0));
}
