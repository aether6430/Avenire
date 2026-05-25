"use client";

import { Button } from "@avenire/ui/components/button";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import type { AvenireEditorRuntime } from "@/components/use-avenire-editor";

const MathPopover = dynamic(
  () =>
    import("@/components/editor/editor-math-popover").then(
      (module) => module.MathPopover
    ),
  { ssr: false }
);

const MermaidPopover = dynamic(
  () =>
    import("@/components/editor/editor-mermaid-popover").then(
      (module) => module.MermaidPopover
    ),
  { ssr: false }
);

const ImagePopover = dynamic(
  () =>
    import("@/components/editor/editor-image-popover").then(
      (module) => module.ImagePopover
    ),
  { ssr: false }
);

interface MermaidDiagramChain {
  run: () => void;
}

interface MermaidEditorCommands {
  updateMermaidDiagram: (options: { pos: number; code: string }) => boolean;
}

interface MermaidEditorChain {
  deleteMermaidDiagram: (options: { pos: number }) => MermaidDiagramChain;
  updateMermaidDiagram: (options: {
    pos: number;
    code: string;
  }) => MermaidDiagramChain;
}

export function EditorStatusOverlays({
  runtime,
}: {
  runtime: AvenireEditorRuntime;
}) {
  const {
    aiReview,
    editor,
    imagePopover,
    imageUploadBusy,
    imageUploadError,
    inlineNotice,
    mathPopover,
    mermaidPopover,
    saveMessage,
    saveState,
    scrollContainerRef,
    setAiReview,
    setImagePopover,
    setImageUploadBusy,
    setImageUploadError,
    setMathPopover,
    setMermaidPopover,
    setTableContextMenu,
    startImageUpload,
    tableActions,
    tableContextMenu,
    tableContextMenuRef,
    tableState,
  } = runtime;

  if (!editor) {
    return null;
  }

  return (
    <>
      <MathPopover
        editor={editor}
        onCancel={() => setMathPopover(null)}
        onChange={(next) => {
          setMathPopover((current) =>
            current ? { ...current, draft: next } : null
          );

          if (!mathPopover) {
            return;
          }

          if (mathPopover.kind === "inlineMath") {
            editor.commands.updateInlineMath({
              pos: mathPopover.pos,
              latex: next,
            });
          } else {
            editor.commands.updateBlockMath({
              pos: mathPopover.pos,
              latex: next,
            });
          }
        }}
        onDelete={() => {
          if (!mathPopover) {
            return;
          }

          if (mathPopover.kind === "inlineMath") {
            editor
              .chain()
              .focus()
              .deleteInlineMath({ pos: mathPopover.pos })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .deleteBlockMath({ pos: mathPopover.pos })
              .run();
          }

          setMathPopover(null);
        }}
        onSave={() => {
          if (!mathPopover) {
            return;
          }

          if (mathPopover.kind === "inlineMath") {
            editor
              .chain()
              .focus()
              .updateInlineMath({
                pos: mathPopover.pos,
                latex: mathPopover.draft,
              })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .updateBlockMath({
                pos: mathPopover.pos,
                latex: mathPopover.draft,
              })
              .run();
          }

          setMathPopover(null);
        }}
        scrollContainerRef={scrollContainerRef}
        value={mathPopover}
      />

      <MermaidPopover
        editor={editor}
        onCancel={() => setMermaidPopover(null)}
        onChange={(next) => {
          setMermaidPopover((current) =>
            current ? { ...current, draft: next } : null
          );
          if (mermaidPopover) {
            (
              editor.commands as unknown as MermaidEditorCommands
            ).updateMermaidDiagram({
              pos: mermaidPopover.pos,
              code: next,
            });
          }
        }}
        onDelete={() => {
          if (!mermaidPopover) {
            return;
          }
          (editor.chain().focus() as unknown as MermaidEditorChain)
            .deleteMermaidDiagram({ pos: mermaidPopover.pos })
            .run();
          setMermaidPopover(null);
        }}
        onSave={() => {
          if (!mermaidPopover) {
            return;
          }
          (editor.chain().focus() as unknown as MermaidEditorChain)
            .updateMermaidDiagram({
              pos: mermaidPopover.pos,
              code: mermaidPopover.draft,
            })
            .run();
          setMermaidPopover(null);
        }}
        scrollContainerRef={scrollContainerRef}
        value={mermaidPopover}
      />

      <ImagePopover
        editor={editor}
        onCancel={() => setImagePopover(null)}
        onChange={(next) => {
          setImagePopover((current) =>
            current ? { ...current, src: next } : null
          );
        }}
        onSave={() => {
          if (!imagePopover) {
            return;
          }
          const src = imagePopover.src.trim();
          if (!src) {
            setImagePopover(null);
            return;
          }
          editor.chain().focus().setImage({ src }).run();
          setImagePopover(null);
        }}
        onTabChange={(tab) => {
          setImagePopover((current) =>
            current ? { ...current, tab } : current
          );
        }}
        onUpload={async (file) => {
          setImageUploadBusy(true);
          setImageUploadError(null);

          try {
            const uploaded = ((await startImageUpload([file])) ?? [])[0] as
              | {
                  ufsUrl?: string;
                  url?: string;
                }
              | undefined;
            const uploadedUrl =
              (typeof uploaded?.ufsUrl === "string" && uploaded.ufsUrl) ||
              (typeof uploaded?.url === "string" && uploaded.url) ||
              null;

            if (!uploadedUrl) {
              throw new Error("Upload returned no file metadata");
            }

            setImagePopover((current) =>
              current
                ? { ...current, src: uploadedUrl, tab: "upload" }
                : current
            );
            editor.chain().focus().setImage({ src: uploadedUrl }).run();
            setImagePopover(null);
          } catch (error) {
            setImageUploadError(
              error instanceof Error ? error.message : "Unable to upload image."
            );
          } finally {
            setImageUploadBusy(false);
          }
        }}
        scrollContainerRef={scrollContainerRef}
        uploadBusy={imageUploadBusy}
        uploadError={imageUploadError}
        value={imagePopover}
      />

      <AnimatePresence>
        {tableContextMenu.open && tableState?.active ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed z-[85] w-56 rounded-md border border-border bg-popover p-1 shadow-lg"
            data-motion-managed="true"
            data-slot="editor-floating-popover"
            exit={{ opacity: 0, scale: 0.98, y: -2 }}
            initial={{ opacity: 0, scale: 0.98, y: -2 }}
            onMouseDown={(event) => event.preventDefault()}
            ref={tableContextMenuRef}
            style={{ left: tableContextMenu.x, top: tableContextMenu.y }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {tableActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={action.disabled}
                  key={action.id}
                  onClick={() => {
                    action.run();
                    setTableContextMenu({ open: false, x: 0, y: 0 });
                  }}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {inlineNotice ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute right-3 bottom-3 z-[90] rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-md"
            data-motion-managed="true"
            data-slot="editor-status-popover"
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {inlineNotice}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {saveState && saveState !== "idle" ? (
        <div
          className="scribe-autosave-badge"
          data-state={saveState}
          role="status"
        >
          {saveMessage ??
            (saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved"
                : "Save failed")}
        </div>
      ) : null}

      <AnimatePresence>
        {aiReview ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute right-3 bottom-3 z-[90] flex items-center gap-2 rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-md"
            data-motion-managed="true"
            data-slot="editor-status-popover"
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <span>Keep generated text?</span>
            <Button
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .deleteRange({
                    from: aiReview.from,
                    to: aiReview.from + aiReview.generatedLength,
                  })
                  .insertContentAt(aiReview.from, aiReview.original)
                  .setTextSelection({
                    from: aiReview.from,
                    to: aiReview.from + aiReview.original.length,
                  })
                  .run();
                setAiReview(null);
              }}
              onMouseDown={(event) => event.preventDefault()}
              size="xs"
              type="button"
              variant="outline"
            >
              Deny
            </Button>
            <Button
              onClick={() => setAiReview(null)}
              onMouseDown={(event) => event.preventDefault()}
              size="xs"
              type="button"
            >
              Accept
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
