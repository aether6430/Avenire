"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpen,
  Brain,
  CheckCircle as CheckCircle2,
  FileText,
  Flask as FlaskConical,
  GraduationCap,
  Upload,
  Lightning as Zap,
} from "@phosphor-icons/react";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { AnimatePresence, m } from "motion/react";
import { useMemo, useState } from "react";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";
import { MindsetCardStack } from "../flashcards/mindset-card-stack";
import { StudentCalendar } from "../student-calendar";
import type { WeakPointGroup } from "./dashboard-home-model";
import { getOnboardingDashboardCards } from "./onboarding-dashboard-cards-model";
import type {
  GeneratedFlashcard,
  GeneratedMindsetState,
  OnboardingMemory,
  OnboardingStepContent,
  OnboardingStepDefinition,
  UploadPhase,
} from "./onboarding-modal-model";
import { memoryToMindsetCards } from "./onboarding-modal-model";

function StepPanels({ content }: { content: OnboardingStepContent[] }) {
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

function WelcomeStep() {
  return (
    <div className="space-y-3">
      {[
        {
          desc: "Avenire turns passive studying into active thinking.",
          icon: <Brain className="h-4 w-4" />,
          label: "Active learning",
        },
        {
          desc: "Know what you know. Fix what you don't.",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "Gap detection",
        },
        {
          desc: "Built for JEE by someone taking JEE.",
          icon: <GraduationCap className="h-4 w-4" />,
          label: "Built in context",
        },
      ].map((item, index) => (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-3xl border border-white/12 bg-white/6 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          initial={{ opacity: 0, y: 10 }}
          key={item.label}
          transition={{
            delay: 0.06 + index * 0.06,
            duration: 0.24,
            ease: "easeOut",
          }}
        >
          <span className="mt-0.5 text-amber-500">{item.icon}</span>
          <div>
            <p className="font-medium text-foreground text-sm leading-none">
              {item.label}
            </p>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {item.desc}
            </p>
          </div>
        </m.div>
      ))}
    </div>
  );
}

function UploadStep({
  rememberedFileName,
  rememberedUploadAt,
  onOpenFiles,
  onPickUpload,
  uploadMessage,
  uploadName,
  uploadPhase,
}: {
  rememberedFileName: string | null;
  rememberedUploadAt: string | null;
  onOpenFiles: () => void;
  onPickUpload: () => void;
  uploadMessage: string | null;
  uploadName: string | null;
  uploadPhase: UploadPhase;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-black/5 shadow-sm">
        <div className="rounded-2xl border border-border/70 border-dashed bg-muted/20 p-6 text-center">
          <m.div
            animate={
              uploadPhase === "uploading"
                ? { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.95] }
                : { scale: 1, opacity: 1 }
            }
            transition={
              uploadPhase === "uploading"
                ? { duration: 1.1, repeat: Number.POSITIVE_INFINITY }
                : { duration: 0.2 }
            }
          >
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          </m.div>
          <p className="font-medium text-sm">
            {uploadPhase === "uploading"
              ? "Uploading inside onboarding"
              : "Drop a PDF or browse from here"}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            The file stays in flow and lands in your workspace root.
          </p>
          <Button className="mt-4 w-full" onClick={onPickUpload} type="button">
            {uploadPhase === "uploading" ? "Uploading..." : "Upload PDF"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: <FileText className="h-4 w-4" />,
              label: "PDFs",
              sub: "Notes and textbooks",
            },
            {
              icon: <BookOpen className="h-4 w-4" />,
              label: "Images",
              sub: "Handwritten pages",
            },
            {
              icon: <FlaskConical className="h-4 w-4" />,
              label: "Videos",
              sub: "Lecture uploads",
            },
          ].map((item) => (
            <div
              className="rounded-2xl border border-border/70 bg-background px-3 py-3 text-center shadow-black/5 shadow-sm"
              key={item.label}
            >
              <span className="mb-1 flex justify-center text-muted-foreground">
                {item.icon}
              </span>
              <p className="font-medium text-xs">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {rememberedFileName || uploadPhase !== "idle" ? (
            <m.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-black/5 shadow-sm"
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Uploaded file
                  </p>
                  <p className="mt-1 truncate font-medium text-foreground text-sm">
                    {uploadName ?? rememberedFileName ?? "Preparing upload"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {uploadMessage ??
                      (rememberedUploadAt
                        ? `Saved locally${rememberedUploadAt ? ` · ${new Date(rememberedUploadAt).toLocaleDateString()}` : ""}`
                        : "Working through the upload pipeline.")}
                  </p>
                </div>
                <Badge className="rounded-md" variant="outline">
                  {uploadPhase === "done"
                    ? "Ready"
                    : uploadPhase === "uploading"
                      ? "Uploading"
                      : rememberedFileName
                        ? "Remembered"
                        : "Queued"}
                </Badge>
              </div>
              {uploadPhase === "uploading" ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <m.div
                    animate={{ x: ["-40%", "120%"] }}
                    className="h-full w-1/3 rounded-full bg-foreground/60"
                    transition={{
                      duration: 1.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                </div>
              ) : null}
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Button
        className="w-full"
        onClick={onOpenFiles}
        type="button"
        variant="outline"
      >
        Open files workspace
      </Button>
    </div>
  );
}

function MisconceptionsStep({
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

function ReviewLoopStep({
  flashcardSets,
  onStartReview,
}: {
  flashcardSets: FlashcardSetSummary[];
  onStartReview: () => void;
}) {
  const [reviewTimeLocal, setReviewTimeLocal] = useState("");

  const currentReviewTarget = useMemo(
    () =>
      flashcardSets
        .slice()
        .sort(
          (left, right) =>
            right.dueCount + right.newCount - (left.dueCount + left.newCount)
        )
        .find((set) => set.dueCount > 0 || set.newCount > 0) ?? null,
    [flashcardSets]
  );

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = [5, 3, 8, 2, 6, 4, 7];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-black/5 shadow-sm">
        <StudentCalendar />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 shadow-black/5 shadow-sm">
          <p className="mb-3 font-medium text-muted-foreground text-xs">
            Next 7 days · cards due
          </p>
          <div className="flex items-end gap-1.5">
            {days.map((day, index) => (
              <div
                className="flex flex-1 flex-col items-center gap-1"
                key={day}
              >
                <m.div
                  animate={{ height: `${counts[index] * 6}px` }}
                  className={cn(
                    "w-full rounded-md",
                    index === 0 ? "bg-foreground/70" : "bg-foreground/20"
                  )}
                  initial={{ height: 0 }}
                  transition={{
                    delay: 0.1 + index * 0.05,
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <span className="text-[9px] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
          <p className="font-medium text-sm">Daily review time</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            This sets the default time for your review reminder. It does not
            start a session by itself. It just tells Avenire when to nudge you
            back tomorrow.
          </p>
          <Input
            className="mt-4"
            onChange={(event) => setReviewTimeLocal(event.target.value)}
            type="time"
            value={reviewTimeLocal}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
          <p className="font-medium text-sm">First review</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Start with the cards that matter most right now.
          </p>
          <Button className="mt-4 w-full" onClick={onStartReview} type="button">
            Start review session
          </Button>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
          <p className="font-medium text-sm">Why this matters</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            A consistent reminder time keeps the review loop predictable.
          </p>
          {reviewTimeLocal ? (
            <p className="mt-3 text-foreground text-sm">
              Reminder time: {reviewTimeLocal}
            </p>
          ) : null}
          {currentReviewTarget ? (
            <p className="mt-2 text-muted-foreground text-sm">
              Reviewing {currentReviewTarget.title} first.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DashboardStep({
  onOpenFlashcards,
  onStartReview,
  onStartChatProbe,
}: {
  onOpenFlashcards: () => void;
  onStartReview: () => void;
  onStartChatProbe: () => void;
}) {
  const dashboardCards = getOnboardingDashboardCards();

  return (
    <div className="space-y-3">
      {dashboardCards.map((item, index) => (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3",
            item.bg
          )}
          initial={{ opacity: 0, y: 10 }}
          key={item.title}
          transition={{
            delay: 0.06 + index * 0.06,
            duration: 0.24,
            ease: "easeOut",
          }}
        >
          <span>
            {item.kind === "chat-probe" ? (
              <Brain className="h-4 w-4 text-muted-foreground" />
            ) : item.kind === "review" ? (
              <Zap className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 font-medium text-sm leading-none">
              {item.title}
            </p>
            <p className="text-muted-foreground text-xs">{item.sub}</p>
          </div>
          <Button
            className="shrink-0 gap-1 text-xs"
            onClick={
              item.kind === "chat-probe"
                ? onStartChatProbe
                : item.kind === "review"
                  ? onStartReview
                  : onOpenFlashcards
            }
            type="button"
            variant="outline"
          >
            {item.action}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </m.div>
      ))}
      <p className="mt-1 text-center text-muted-foreground text-xs italic">
        This becomes your home base from here on.
      </p>
    </div>
  );
}

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

export function OnboardingStepBody({
  activeMisconceptions,
  flashcardSets,
  generationError,
  generationStatus,
  memory,
  onGenerateFlashcards,
  onOpenFiles,
  onOpenFlashcards,
  onPickUpload,
  onStartChatProbe,
  onStartReview,
  step,
  uploadMessage,
  uploadName,
  uploadPhase,
  weakPointGroups,
}: {
  activeMisconceptions: MisconceptionRecord[];
  flashcardSets: FlashcardSetSummary[];
  generationError: string | null;
  generationStatus: GeneratedMindsetState;
  memory: OnboardingMemory;
  onGenerateFlashcards: () => void;
  onOpenFiles: () => void;
  onOpenFlashcards: () => void;
  onPickUpload: () => void;
  onStartChatProbe: () => void;
  onStartReview: () => void;
  step: OnboardingStepDefinition;
  uploadMessage: string | null;
  uploadName: string | null;
  uploadPhase: UploadPhase;
  weakPointGroups: WeakPointGroup[];
}) {
  if (step.id === "welcome") {
    return <WelcomeStep />;
  }

  if (step.id === "upload") {
    return (
      <UploadStep
        onOpenFiles={onOpenFiles}
        onPickUpload={onPickUpload}
        rememberedFileName={memory.uploadFileName}
        rememberedUploadAt={memory.uploadAt}
        uploadMessage={uploadMessage}
        uploadName={uploadName}
        uploadPhase={uploadPhase}
      />
    );
  }

  if (step.id === "misconceptions") {
    return (
      <MisconceptionsStep
        activeMisconceptions={activeMisconceptions}
        generatedCards={memory.generatedCards}
        generationError={generationError}
        generationStatus={generationStatus}
        onGenerateFlashcards={onGenerateFlashcards}
        onStartChatProbe={onStartChatProbe}
        weakPointGroups={weakPointGroups}
      />
    );
  }

  if (step.id === "review_loop") {
    return (
      <ReviewLoopStep
        flashcardSets={flashcardSets}
        onStartReview={onStartReview}
      />
    );
  }

  if (step.id === "dashboard") {
    return (
      <DashboardStep
        onOpenFlashcards={onOpenFlashcards}
        onStartChatProbe={onStartChatProbe}
        onStartReview={onStartReview}
      />
    );
  }

  return <StepPanels content={step.content} />;
}
