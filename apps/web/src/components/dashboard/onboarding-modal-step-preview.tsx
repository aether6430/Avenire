"use client";

import type { OnboardingStepDefinition } from "./onboarding-modal-model";

export function OnboardingStepPreview({
  step,
}: {
  step: OnboardingStepDefinition;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="rounded-xl bg-muted p-5">
        {step.id === "welcome" ? (
          <div className="space-y-6 rounded-xl border border-border/40 bg-card p-5 text-foreground">
            <div className="space-y-1">
              <p className="font-semibold text-lg">Jason</p>
              <p className="max-w-[14rem] text-base text-muted-foreground leading-6">
                Where should I start if my weak point is electric flux?
              </p>
            </div>
            <div className="space-y-1 border-border/40 border-t pt-4">
              <p className="font-semibold text-base">
                Apollo workspace assistant
              </p>
              <p className="max-w-[15rem] text-base text-muted-foreground leading-6">
                Start with the misconception probe, then review the first due
                mindset set and land in the calendar.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/40 bg-card p-5 text-foreground">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
              Step {step.step}
            </p>
            <p className="mt-3 font-mono text-3xl leading-none">{step.title}</p>
            <p className="mt-4 text-muted-foreground text-sm leading-6">
              {step.subtitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
