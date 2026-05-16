"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Dialog, DialogContent } from "@avenire/ui/components/dialog";
import { AnimatePresence, m } from "framer-motion";
import {
  ONBOARDING_STEPS,
  type OnboardingModalProps,
  STEP_TRANSITION,
} from "@/components/dashboard/onboarding-modal-model";
import {
  OnboardingStepBody,
  OnboardingStepDots,
  OnboardingStepPreview,
} from "@/components/dashboard/onboarding-modal-steps";
import type { OnboardingModalRuntime } from "@/components/dashboard/use-onboarding-modal";

export function OnboardingModalSurface({
  activeMisconceptions,
  flashcardSets,
  onOpenFiles,
  onOpenFlashcards,
  onStartChatProbe,
  onStartReview,
  open,
  runtime,
  weakPointGroups,
}: Pick<
  OnboardingModalProps,
  | "activeMisconceptions"
  | "flashcardSets"
  | "onOpenFiles"
  | "onOpenFlashcards"
  | "onStartChatProbe"
  | "onStartReview"
  | "open"
  | "weakPointGroups"
> & {
  runtime: OnboardingModalRuntime;
}) {
  return (
    <Dialog onOpenChange={() => undefined} open={open}>
      <DialogContent
        className="h-[100dvh] w-[min(100vw-1rem,78rem)] max-w-none overflow-hidden rounded-2xl border border-border/70 bg-background p-0 shadow-[0_50px_120px_-60px_rgba(0,0,0,0.75)] sm:h-[92vh] sm:w-[min(100vw-2rem,78rem)]"
        largeWidth
        showCloseButton={false}
      >
        <input
          accept="application/pdf"
          className="hidden"
          onChange={runtime.handleUploadSelection}
          ref={runtime.fileInputRef}
          type="file"
        />

        <div className="grid h-full min-h-0 lg:grid-cols-[minmax(280px,0.44fr)_minmax(0,0.56fr)]">
          <aside className="flex min-h-0 flex-col justify-between border-border/70 border-b bg-muted/20 px-5 py-5 lg:border-r lg:border-b-0 lg:px-8 lg:py-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-semibold text-muted-foreground/60 text-xs uppercase tracking-[0.24em]">
                  Onboarding
                </p>
                <h2 className="max-w-sm font-mono text-4xl text-foreground leading-none tracking-tight">
                  Q&amp;A agents
                </h2>
                <p className="max-w-sm text-muted-foreground text-sm leading-6">
                  Answers repeat questions using your workspace, files,
                  misconceptions, and connected study tools.
                </p>
              </div>

              <OnboardingStepPreview step={runtime.step} />

              <OnboardingStepDots
                activeStepIndex={runtime.activeStepIndex}
                onSelect={runtime.goTo}
                steps={ONBOARDING_STEPS}
              />
            </div>

            <div className="hidden items-center gap-2 text-muted-foreground/40 text-sm lg:flex">
              <span className="block size-2 rounded-full bg-foreground/40" />
              <span className="block size-2 rounded-full bg-foreground/10" />
              <span className="block size-2 rounded-full bg-foreground/10" />
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-background">
            <header className="flex items-start justify-between gap-4 border-border/70 border-b px-4 py-4 sm:px-6">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="rounded-full bg-secondary text-secondary-foreground"
                    variant="secondary"
                  >
                    {runtime.step.tag}
                  </Badge>
                  <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Step {runtime.step.step}
                  </span>
                </div>
                <h3 className="font-mono text-3xl text-foreground leading-none">
                  {runtime.step.title}
                </h3>
                <p className="max-w-2xl text-muted-foreground text-sm leading-6">
                  {runtime.step.note}
                </p>
              </div>
              <div className="hidden shrink-0 rounded-full border border-border/70 px-3 py-1 text-muted-foreground text-xs uppercase tracking-[0.18em] sm:block">
                {runtime.step.skippable ? "Optional" : "Required"}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <AnimatePresence custom={runtime.direction} mode="wait">
                <m.div
                  animate="center"
                  custom={runtime.direction}
                  exit="exit"
                  initial="enter"
                  key={`${runtime.step.id}-body`}
                  transition={{ duration: 0.3 }}
                  variants={STEP_TRANSITION}
                >
                  <OnboardingStepBody
                    activeMisconceptions={activeMisconceptions}
                    flashcardSets={flashcardSets}
                    generationError={runtime.generationError}
                    generationStatus={runtime.generationStatus}
                    memory={runtime.memory}
                    onGenerateFlashcards={runtime.generateFlashcards}
                    onOpenFiles={onOpenFiles}
                    onOpenFlashcards={onOpenFlashcards}
                    onPickUpload={runtime.pickUpload}
                    onStartChatProbe={onStartChatProbe}
                    onStartReview={onStartReview}
                    step={runtime.step}
                    uploadMessage={runtime.uploadMessage}
                    uploadName={runtime.uploadName}
                    uploadPhase={runtime.uploadPhase}
                    weakPointGroups={weakPointGroups}
                  />
                </m.div>
              </AnimatePresence>
            </div>

            <footer className="border-border/70 border-t bg-background/96 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={runtime.activeStepIndex === 0}
                  onClick={runtime.handleBack}
                  type="button"
                  variant="ghost"
                >
                  Back
                </Button>

                <OnboardingStepDots
                  activeStepIndex={runtime.activeStepIndex}
                  onSelect={runtime.goTo}
                  steps={ONBOARDING_STEPS}
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {runtime.step.skippable && !runtime.isLast ? (
                    <Button
                      onClick={() => runtime.goTo(runtime.activeStepIndex + 1)}
                      type="button"
                      variant="outline"
                    >
                      Skip for now
                    </Button>
                  ) : null}
                  <Button onClick={runtime.handleNext} type="button">
                    {runtime.step.id === "review_loop"
                      ? "Save & continue"
                      : runtime.isLast
                        ? "Finish setup"
                        : "Continue"}
                  </Button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
