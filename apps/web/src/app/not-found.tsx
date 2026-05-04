"use client";

import Link from "next/link";
import { useRef } from "react";
import { ParticleField } from "@/components/ui/particle-field";

const emptyRoomSrc = "/figures/empty-room.png";

export default function NotFound() {
  const typingImpulse = useRef(0);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-background">
      <ParticleField
        align="center"
        className="absolute inset-0"
        dotSize={0.95}
        mouseForce={30}
        mouseRadius={92}
        renderScale={1}
        sampleStep={3}
        src={emptyRoomSrc}
        threshold={38}
        typingImpulseRef={typingImpulse}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 55%, transparent 40%, color-mix(in srgb, var(--background) 85%, transparent) 95%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--background) 55%, transparent) 38%, color-mix(in srgb, var(--background) 88%, transparent) 70%, var(--background) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%]"
        style={{
          background:
            "radial-gradient(420px 220px at 50% 78%, color-mix(in srgb, var(--background) 85%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-6 pb-16 text-center">
        <div
          className="pointer-events-none font-mono text-[11px] text-foreground/55 uppercase tracking-[0.3em]"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
        >
          Error 404
        </div>
        <h1
          className="pointer-events-none max-w-xl text-3xl text-foreground leading-tight md:text-4xl"
          style={{ textShadow: "0 1px 24px rgba(0,0,0,0.65)" }}
        >
          This page isn&apos;t here.
        </h1>
        <p
          className="pointer-events-none max-w-md text-foreground/70 text-sm leading-relaxed"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
        >
          The route you asked for doesn&apos;t exist. Head back to the workspace
          or start again from home.
        </p>
        <Link
          className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
          href="/workspace"
        >
          Open workspace
        </Link>
        <p className="max-w-md text-foreground/55 text-xs">
          Or go back to the{" "}
          <Link className="underline underline-offset-4" href="/">
            homepage
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
