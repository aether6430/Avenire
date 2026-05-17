"use client";

import { m } from "motion/react";
import type { OnboardingStepContent } from "./onboarding-modal-model";

export function StepPanels({ content }: { content: OnboardingStepContent[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {content.map((entry, index) => (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-black/5 shadow-sm"
          initial={{ opacity: 0, y: 12 }}
          key={entry.label}
          transition={{
            delay: 0.05 + index * 0.05,
            duration: 0.24,
            ease: "easeOut",
          }}
        >
          <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            {entry.label}
          </p>
          <p className="mt-2 text-foreground/90 text-sm leading-6">
            {entry.detail}
          </p>
        </m.div>
      ))}
    </div>
  );
}
