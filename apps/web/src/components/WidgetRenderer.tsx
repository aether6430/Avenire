"use client";

import { useWidgetRenderer } from "@/components/use-widget-renderer";
import type { WidgetRendererProps } from "@/components/widget-renderer-model";

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
    <div
      className={`relative w-full overflow-visible rounded-lg bg-card ${className}`}
    >
      {isStreaming ? (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg bg-background/[0.03] backdrop-blur-[0.5px]">
          <div
            className="absolute inset-0 bg-foreground/[0.035]"
            style={{ animation: "widgetPulse 1.6s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes widgetPulse {
              0%, 100% { opacity: 0.18; }
              50% { opacity: 0.42; }
            }
          `}</style>
        </div>
      ) : null}
      <iframe
        onLoad={runtime.handleLoad}
        ref={runtime.iframeRef}
        sandbox="allow-scripts"
        style={{
          background: "var(--card)",
          border: "none",
          display: "block",
          height: `${runtime.autoHeightRef.current}px`,
          width: "100%",
        }}
        title="Avenire Widget"
      />
    </div>
  );
}
