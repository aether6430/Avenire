"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  Check,
  CaretDown as ChevronDown,
  Code,
  Highlighter,
  TextItalic as Italic,
  LinkSimple as Link2,
  Palette,
  TextStrikethrough as Strikethrough,
} from "@phosphor-icons/react";
import { TextB as Bold } from "@phosphor-icons/react/TextB";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { ReactNode, RefObject } from "react";
import { getScrollTarget, VIEWPORT_PADDING } from "./editor-core";

const TEXT_COLORS = [
  { name: "Default", value: null },
  { name: "Gray", value: "#9B9A97" },
  { name: "Brown", value: "#64473A" },
  { name: "Orange", value: "#D9730D" },
  { name: "Yellow", value: "#DFAB01" },
  { name: "Green", value: "#0F7B6C" },
  { name: "Blue", value: "#0B6E99" },
  { name: "Purple", value: "#6940A5" },
  { name: "Pink", value: "#AD1A72" },
  { name: "Red", value: "#E03E3E" },
] as const;

const BG_COLORS = [
  { name: "Default", value: null },
  { name: "Gray", value: "#EBECED" },
  { name: "Brown", value: "#E9E5E3" },
  { name: "Orange", value: "#FAEBDD" },
  { name: "Yellow", value: "#FBF3DB" },
  { name: "Green", value: "#DDEDEA" },
  { name: "Blue", value: "#DDEBF1" },
  { name: "Purple", value: "#EAE4F2" },
  { name: "Pink", value: "#F4DFEB" },
  { name: "Red", value: "#FBE4E4" },
] as const;

function linkPrompt(editor: Editor) {
  const previous =
    (editor.getAttributes("link").href as string | undefined) ?? "";
  const raw = window.prompt("Paste a URL", previous);

  if (raw === null) {
    return;
  }

  const value = raw.trim();

  if (!value) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

function ToolbarButton({
  title,
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      aria-label={title}
      className={cn(
        "h-7 w-7 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      size="icon-sm"
      title={title}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

export function SelectionBubbleMenu({
  editor,
  scrollContainerRef,
}: {
  editor: Editor;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor ? editor.isActive("bold") : false,
      italic: editor ? editor.isActive("italic") : false,
      strike: editor ? editor.isActive("strike") : false,
      code: editor ? editor.isActive("code") : false,
      highlight: editor ? editor.isActive("highlight") : false,
      link: editor ? editor.isActive("link") : false,
      table: editor ? editor.isActive("table") : false,
      textColor: editor
        ? (editor.getAttributes("textStyle").color as string)
        : null,
      highlightColor: editor
        ? (editor.getAttributes("highlight").color as string)
        : null,
    }),
  });

  return (
    <BubbleMenu
      appendTo={() => document.body}
      className="z-[80]"
      editor={editor}
      getReferencedVirtualElement={() => {
        const { from } = editor.state.selection;
        const pos = Math.max(1, from);
        const coords = editor.view.coordsAtPos(pos);

        return {
          getBoundingClientRect: () =>
            new DOMRect(
              coords.left,
              coords.top,
              1,
              Math.max(1, coords.bottom - coords.top)
            ),
        };
      }}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        flip: { padding: VIEWPORT_PADDING },
        shift: { padding: VIEWPORT_PADDING },
        scrollTarget: getScrollTarget(scrollContainerRef),
      }}
      pluginKey="formattingBubbleMenu"
      resizeDelay={0}
      shouldShow={({ editor, state }) =>
        Boolean(editor) &&
        state.selection instanceof TextSelection &&
        !state.selection.empty &&
        state.doc.textBetween(state.selection.from, state.selection.to).trim()
          .length > 0 &&
        !editor.isActive("table") &&
        !editor.isActive("inlineMath") &&
        !editor.isActive("blockMath") &&
        !editor.isActive("image") &&
        !editor.isActive("mermaidDiagram")
      }
      updateDelay={0}
    >
      <div className="flex items-center gap-1 rounded-xl border border-border bg-popover p-1 shadow-black/5 shadow-lg">
        <ToolbarButton
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={state.highlight}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
        >
          <Highlighter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs hover:bg-accent hover:text-accent-foreground"
            onMouseDown={(event) => event.preventDefault()}
          >
            Turn into
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={6}>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Text
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              Bullet list
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              Numbered list
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              To-do list
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              Code block
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs hover:bg-accent hover:text-accent-foreground"
            onMouseDown={(event) => event.preventDefault()}
          >
            <Palette className="h-3.5 w-3.5" />
            Color
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={6}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Text</DropdownMenuLabel>
              {TEXT_COLORS.map((item) => (
                <DropdownMenuItem
                  key={`text-${item.name}`}
                  onClick={() => {
                    const chain = editor.chain().focus();
                    if (!item.value) {
                      chain.unsetColor().run();
                      return;
                    }
                    chain.setColor(item.value).run();
                  }}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-sm border border-border"
                    style={{ background: item.value ?? "transparent" }}
                  />
                  {item.name}
                  {(item.value === null && !state.textColor) ||
                  item.value === state.textColor ? (
                    <Check className="ml-auto h-3.5 w-3.5" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Background</DropdownMenuLabel>
              {BG_COLORS.map((item) => (
                <DropdownMenuItem
                  key={`bg-${item.name}`}
                  onClick={() => {
                    const chain = editor.chain().focus();
                    if (!item.value) {
                      chain.unsetHighlight().run();
                      return;
                    }
                    chain.setHighlight({ color: item.value }).run();
                  }}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-sm border border-border"
                    style={{ background: item.value ?? "transparent" }}
                  />
                  {item.name}
                  {(item.value === null && !state.highlightColor) ||
                  item.value === state.highlightColor ? (
                    <Check className="ml-auto h-3.5 w-3.5" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToolbarButton
          active={state.link}
          onClick={() => linkPrompt(editor)}
          title={state.link ? "Edit link" : "Add link"}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
}
