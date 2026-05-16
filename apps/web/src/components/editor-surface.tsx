"use client";

import dynamic from "next/dynamic";
import type { AvenireEditorRuntime } from "@/components/use-avenire-editor";

const EditorDocumentBody = dynamic(
  () =>
    import("@/components/editor/editor-document-body").then(
      (module) => module.EditorDocumentBody
    ),
  { ssr: false }
);

const EditorFloatingLayer = dynamic(
  () =>
    import("@/components/editor/editor-floating-layer").then(
      (module) => module.EditorFloatingLayer
    ),
  { ssr: false }
);

const EditorStatusOverlays = dynamic(
  () =>
    import("@/components/editor/editor-status-overlays").then(
      (module) => module.EditorStatusOverlays
    ),
  { ssr: false }
);

export function AvenireEditorSurface({
  runtime,
}: {
  runtime: AvenireEditorRuntime;
}) {
  if (!runtime.editor) {
    return null;
  }

  return (
    <div className="scribe-shell">
      <EditorFloatingLayer runtime={runtime} />
      <EditorDocumentBody runtime={runtime} />
      <EditorStatusOverlays runtime={runtime} />
    </div>
  );
}
