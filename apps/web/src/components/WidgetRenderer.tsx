"use client";

import { useWidgetRenderer } from "@/components/use-widget-renderer";
import type { WidgetRendererProps } from "@/components/widget-renderer-model";
import { WidgetRendererSurface } from "@/components/widget-renderer-surface";

export function WidgetRenderer({
  html,
  onSendMessage,
  onOpenLink,
  runScripts = true,
  isStreaming = false,
  className = "",
}: WidgetRendererProps) {
  const runtime = useWidgetRenderer({
    html,
    onOpenLink,
    onSendMessage,
    runScripts,
  });

  return (
    <WidgetRendererSurface
      className={className}
      iframeHeight={`${runtime.autoHeightRef.current}px`}
      iframeRef={runtime.iframeRef}
      isStreaming={isStreaming}
      onLoad={runtime.handleLoad}
    />
  );
}
