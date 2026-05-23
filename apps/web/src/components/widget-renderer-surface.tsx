"use client";

import type { RefObject } from "react";

export function WidgetRendererSurface({
  className,
  iframeHeight,
  iframeRef,
  isStreaming,
  onLoad,
}: {
  className: string;
  iframeHeight: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isStreaming: boolean;
  onLoad: () => void;
}) {
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
        onLoad={onLoad}
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{
          background: "var(--card)",
          border: "none",
          display: "block",
          height: iframeHeight,
          width: "100%",
        }}
        title="Avenire Widget"
      />
    </div>
  );
}
