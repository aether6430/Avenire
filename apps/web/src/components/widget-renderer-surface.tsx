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
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg bg-background/5 backdrop-blur-[0.5px]">
          <div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
            style={{ animation: "shimmer 2.5s infinite linear" }}
          />
          <style>{`
            @keyframes shimmer {
              100% { transform: translateX(100%); }
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
