"use client";

import { cn } from "@avenire/ui/lib/utils";
import type { OnboardingStepDefinition } from "./onboarding-modal-model";

export function OnboardingStepDots({
  activeStepIndex,
  onSelect,
  steps,
}: {
  activeStepIndex: number;
  onSelect: (nextIndex: number) => void;
  steps: OnboardingStepDefinition[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {steps.map((item, index) => {
        const isActive = index === activeStepIndex;
        const isComplete = index < activeStepIndex;

        return (
          <button
            aria-label={`${item.step}. ${item.title}`}
            className="group relative p-1"
            key={item.id}
            onClick={() => onSelect(index)}
            title={`${item.title} · ${item.subtitle}`}
            type="button"
          >
            <span
              className={cn(
                "block size-2.5 rounded-full transition-all duration-200",
                isActive
                  ? "scale-125 bg-foreground"
                  : isComplete
                    ? "bg-foreground/50"
                    : "bg-border group-hover:bg-foreground/40"
              )}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-[12rem] -translate-x-1/2 rounded-md border border-border/70 bg-popover px-2 py-1 text-left text-[11px] text-popover-foreground shadow-sm group-hover:block group-focus-visible:block">
              <span className="block text-muted-foreground uppercase tracking-[0.18em]">
                {item.tag}
              </span>
              <span className="block text-xs">{item.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
