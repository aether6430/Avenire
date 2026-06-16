"use client";

import { WaitlistForm } from "@avenire/auth/components/waitlist";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ParticleField } from "@/components/ui/particle-field";

const emptyRoomSrc = "/figures/empty-room.png";

export function WaitlistPageClient() {
  const typingImpulse = useRef(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Ensure dark class is on html element for portal content (dialog)
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("dark");
    return () => {
      html.classList.remove("dark");
    };
  }, []);

  return (
    <>
      <div className="dark relative h-dvh w-dvw overflow-hidden bg-background">
        <ParticleField
          adaptToTheme={false}
          align="center"
          className="absolute inset-0"
          color="rgba(255, 255, 255, 0.92)"
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
            Invite-only, for now
          </div>
          <h1
            className="pointer-events-none max-w-xl text-3xl text-foreground leading-tight md:text-4xl"
            style={{ textShadow: "0 1px 24px rgba(0,0,0,0.65)" }}
          >
            Early access is opening in waves.
          </h1>
          <p
            className="pointer-events-none max-w-md text-foreground/70 text-sm leading-relaxed"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
          >
            Join the waitlist and we&apos;ll email you as soon as your invite is
            ready.
          </p>
          <button
            className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
            onClick={() => setIsDialogOpen(true)}
            type="button"
          >
            Join the waitlist
          </button>
          <p className="max-w-md text-foreground/55 text-xs">
            Joining the waitlist means you agree to our{" "}
            <Link className="underline underline-offset-4" href="/terms">
              Terms
            </Link>{" "}
            and{" "}
            <Link className="underline underline-offset-4" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="dark sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join the waitlist</DialogTitle>
            <DialogDescription>
              Leave your email and we&apos;ll let you know when access opens.
            </DialogDescription>
          </DialogHeader>
          <WaitlistForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
