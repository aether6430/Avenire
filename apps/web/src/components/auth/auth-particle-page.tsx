"use client";

import type { ReactNode } from "react";
import { ParticleField } from "@/components/ui/particle-field";

export function AuthParticlePage({
  children,
  footer,
  src,
}: {
  children: ReactNode;
  footer?: ReactNode;
  src: string;
}) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <ParticleField
        align="center"
        className="fixed inset-0"
        denseParticles
        dotSize={0.98}
        mouseForce={32}
        mouseRadius={96}
        renderScale={1}
        sampleStep={3}
        src={src}
        threshold={36}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 55%, transparent 40%, color-mix(in srgb, var(--background) 85%, transparent) 95%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[46%]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--background) 55%, transparent) 38%, color-mix(in srgb, var(--background) 88%, transparent) 70%, var(--background) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[32%]"
        style={{
          background:
            "radial-gradient(420px 220px at 50% 78%, color-mix(in srgb, var(--background) 85%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex min-h-svh items-end justify-center px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="w-full max-w-lg">
          {children}
          {footer ? (
            <div className="mt-4 text-center text-xs text-muted-foreground/80">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
