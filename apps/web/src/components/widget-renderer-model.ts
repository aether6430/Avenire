"use client";

export interface WidgetRendererProps {
  className?: string;
  html: string;
  isStreaming?: boolean;
  onOpenLink?: (url: string) => void;
  onSendMessage?: (text: string) => void;
  runScripts?: boolean;
}

export { buildIframeDocument } from "@/components/widget-renderer-iframe-document";
export {
  buildCanvasThemeBlock,
  buildCssVarBlock,
  extractThemeVars,
} from "@/components/widget-renderer-theme";
