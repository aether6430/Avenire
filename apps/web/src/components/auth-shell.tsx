"use client";

import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useContext,
  useRef,
} from "react";
import { ParticleField } from "@/components/ui/particle-field";

const TypingImpulseContext = createContext<MutableRefObject<number> | null>(
  null
);

export function useAuthTypingImpulse() {
  const value = useContext(TypingImpulseContext);
  if (!value) {
    throw new Error("useAuthTypingImpulse must be used within AuthShell");
  }
  return value;
}

export function AuthShell({
  children,
  variant = "welcome",
}: {
  children: ReactNode;
  variant?: "onboarding" | "welcome";
}) {
  const typingImpulse = useRef(0);
  const particleSrc =
    variant === "onboarding"
      ? "/figures/onboarding-team.png"
      : "/figures/welcome.png";

  return (
    <TypingImpulseContext.Provider value={typingImpulse}>
      <main className="dark min-h-svh bg-background text-foreground">
        <div className="mx-auto flex min-h-svh w-full max-w-[1320px]">
          <section className="relative hidden min-h-svh w-[48%] overflow-hidden border-border/60 border-r md:block lg:w-1/2">
            <ParticleField
              align="center"
              className="absolute inset-0"
              denseParticles
              dotSize={1}
              mouseForce={34}
              mouseRadius={96}
              renderScale={1.05}
              sampleStep={3}
              src={particleSrc}
              threshold={34}
              typingImpulseRef={typingImpulse}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(900px 600px at 50% 52%, transparent 45%, color-mix(in srgb, var(--background) 88%, transparent) 92%)",
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-8 lg:p-12">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                Avenire
              </div>
              <div className="max-w-md">
                {variant === "onboarding" ? (
                  <>
                    <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                      A source-first workflow
                    </div>
                    <p className="mt-3 text-xl leading-snug md:text-2xl">
                      Upload the material, generate the cards, then use Apollo
                      to close the gaps.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                      A study-first workspace
                    </div>
                    <p className="mt-3 text-xl leading-snug md:text-2xl">
                      Built for deep study, research, and interactive reasoning.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="relative flex min-h-svh w-full items-center justify-center px-4 py-8 sm:px-6 md:w-[52%] md:px-10 lg:w-1/2">
            <div className="absolute top-5 left-5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em] md:hidden">
              Avenire
            </div>
            <div className="w-full max-w-xl pt-8 md:pt-0">{children}</div>
          </section>
        </div>
      </main>
    </TypingImpulseContext.Provider>
  );
}
