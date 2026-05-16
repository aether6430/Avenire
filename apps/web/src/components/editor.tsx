"use client";

import { memo } from "react";
import "../editor.css";
import type { AvenireEditorProps } from "./editor-shared";
import { AvenireEditorSurface } from "./editor-surface";
import { useAvenireEditor } from "./use-avenire-editor";

function AvenireEditor(props: AvenireEditorProps) {
  const runtime = useAvenireEditor(props);
  return <AvenireEditorSurface runtime={runtime} />;
}

export default memo(AvenireEditor);
