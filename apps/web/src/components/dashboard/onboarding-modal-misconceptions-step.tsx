"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import { m } from "motion/react";
import { useMemo } from "react";
import type { MisconceptionRecord } from "@/lib/learning-data";
import { MindsetCardStack } from "../flashcards/mindset-card-stack";
import type { WeakPointGroup } from "./dashboard-home-model";
import type {
  GeneratedFlashcard,
  GeneratedMindsetState,
} from "./onboarding-modal-model";
import { memoryToMindsetCards } from "./onboarding-modal-model";

export function MisconceptionsStep({
  activeMisconceptions,
  generatedCards,
  generationError,
  generationStatus,
  onGenerateFlashcards,
  onStartChatProbe,
  weakPointGroups,
}: {
  activeMisconceptions: MisconceptionRecord[];
  generatedCards: GeneratedFlashcard[];
  generationError: string | null;
  generationStatus: GeneratedMindsetState;
  onGenerateFlashcards: () => void;
  onStartChatProbe: () => void;
  weakPointGroups: WeakPointGroup[];
}) {
  const activeMisconception = activeMisconceptions[0] ?? null;
  const physicsFocused = weakPointGroups.some((group) =>
    `${group.subject} ${group.topic}`.toLowerCase().includes("physics")
  );
  const generatedMindsetCards = useMemo(
    () =>
      memoryToMindsetCards({
        generatedCards,
        generatedMindsetTitle: null,
        generatedSetId: null,
        uploadAt: null,
        uploadFileName: null,
      }),
    [generatedCards]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-black/5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Badge className="font-medium text-[10px]" variant="secondary">
            Concept check · 1 of 3
          </Badge>
        </div>
        <p className="font-medium text-sm leading-snug">
          A Gaussian surface encloses a dipole. What is the net electric flux
          through it?
        </p>
        <div className="mt-4 grid gap-2">
          {["Q / ε₀", "Zero", "2Q / ε₀", "Depends on orientation"].map(
            (option, index) => (
              <button
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                  index === 1
                    ? "border-border bg-muted/40 text-foreground"
                    : "border-border/60 bg-background hover:bg-muted/30"
                )}
                key={option}
                type="button"
              >
                {option}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
            <p className="font-medium text-sm">Probe this gap</p>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              Let Apollo ask targeted questions from your current material and
              turn wrong answers into misconceptions.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={onStartChatProbe} type="button">
                Method with Apollo
              </Button>
              <Button
                disabled={generationStatus === "loading"}
                onClick={onGenerateFlashcards}
                type="button"
                variant="outline"
              >
                {generationStatus === "loading"
                  ? "Generating..."
                  : generatedCards.length > 0
                    ? "Regenerate mindset set"
                    : "Generate mindset set"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
            <p className="font-medium text-sm">Captured misconception</p>
            {activeMisconception ? (
              <div className="mt-2 rounded-xl border border-border/60 bg-background p-3">
                <p className="text-foreground text-sm">
                  {activeMisconception.concept}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {activeMisconception.subject} / {activeMisconception.topic}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground text-sm">
                Your first wrong answer will populate this panel.
              </p>
            )}
          </div>

          {physicsFocused ? (
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
              <p className="font-medium text-sm">
                Physics sim path is available
              </p>
              <p className="mt-2 text-muted-foreground text-sm leading-6">
                Your weak-point map suggests Physics, so Apollo can spin up a
                simulation-focused explanation next.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-black/5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Generated mindset set</p>
              <p className="mt-1 text-muted-foreground text-xs">
                The mindset stays in onboarding, stored locally, and can be
                reviewed without leaving this flow.
              </p>
            </div>
            <Badge className="rounded-md" variant="outline">
              {generationStatus === "loading"
                ? "Generating"
                : generatedCards.length > 0
                  ? "Saved locally"
                  : "Not generated"}
            </Badge>
          </div>

          <div className="mt-4">
            {generationStatus === "loading" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {["Drafting", "Checking", "Saving"].map((label, index) => (
                  <div
                    className="rounded-2xl border border-border/70 bg-background px-4 py-5"
                    key={label}
                  >
                    <m.div
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      className="h-2 w-16 rounded-full bg-foreground/40"
                      transition={{
                        duration: 1.1,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.1,
                      }}
                    />
                    <p className="mt-3 font-medium text-foreground text-sm">
                      {label}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Building the mindset set in place.
                    </p>
                  </div>
                ))}
              </div>
            ) : generatedMindsetCards.length > 0 ? (
              <MindsetCardStack
                cards={generatedMindsetCards}
                className="max-w-none"
                showCounter={false}
                stackLabel="Generated mindset set"
              />
            ) : (
              <div className="rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 py-8 text-muted-foreground text-sm">
                Generate a mindset set here and it will render without sending
                you away to another page.
              </div>
            )}
          </div>

          {generationError ? (
            <p className="mt-3 text-muted-foreground text-sm">
              {generationError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
