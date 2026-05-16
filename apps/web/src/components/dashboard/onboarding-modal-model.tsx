"use client";

import type { Variants } from "framer-motion";
import type { WeakPointGroup } from "@/components/dashboard/dashboard-home-model";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";

export type { WeakPointGroup } from "@/components/dashboard/dashboard-home-model";

export interface OnboardingStepDefinition {
  content: OnboardingStepContent[];
  id: string;
  note: string;
  skippable: boolean;
  step: number;
  subtitle: string;
  tag: string;
  title: string;
}

export interface OnboardingStepContent {
  detail: string;
  label: string;
}

export type UploadPhase = "idle" | "picking" | "uploading" | "done" | "failed";
export type GeneratedMindsetState = "idle" | "loading" | "error" | "ready";

export interface GeneratedFlashcard {
  backMarkdown: string;
  frontMarkdown: string;
  id?: string;
  notesMarkdown?: string | null;
  tags: string[];
}

export interface OnboardingMemory {
  generatedCards: GeneratedFlashcard[];
  generatedMindsetTitle: string | null;
  generatedSetId: string | null;
  uploadAt: string | null;
  uploadFileName: string | null;
}

export interface OnboardingModalProps {
  activeMisconceptions: MisconceptionRecord[];
  flashcardSets: FlashcardSetSummary[];
  onComplete: () => Promise<void>;
  onOpenFiles: () => void;
  onOpenFlashcards: () => void;
  onStartChatProbe: () => void;
  onStartReview: () => void;
  open: boolean;
  rootFolderId: string;
  setOnboardingStep: (stepIndex: number) => void;
  stepIndex: number;
  weakPointGroups: WeakPointGroup[];
  workspaceUuid: string;
}

export interface OnboardingSourceMisconception {
  concept: string;
  reason: string;
  subject: string;
  topic: string;
}

const ONBOARDING_STORAGE_PREFIX = "avenire:onboarding-memory:v2";

export const EMPTY_ONBOARDING_MEMORY: OnboardingMemory = {
  generatedCards: [],
  generatedMindsetTitle: null,
  generatedSetId: null,
  uploadAt: null,
  uploadFileName: null,
};

export const STEP_TRANSITION: Variants = {
  enter: (dir: number) => ({
    filter: "blur(5px)",
    opacity: 0,
    x: dir > 0 ? 36 : -36,
  }),
  center: {
    filter: "blur(0px)",
    opacity: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
    x: 0,
  },
  exit: (dir: number) => ({
    filter: "blur(5px)",
    opacity: 0,
    x: dir > 0 ? -36 : 36,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    content: [
      {
        detail: "Avenire turns passive studying into active thinking.",
        label: "Active learning",
      },
      {
        detail: "Know what you know. Fix what you don't.",
        label: "Gap detection",
      },
      {
        detail: "Built for JEE by someone taking JEE.",
        label: "Built in context",
      },
    ],
    id: "welcome",
    note: "The first screen should feel sharp, not crowded. This is the promise, not the product dump.",
    skippable: false,
    step: 1,
    subtitle: "A short pitch that tells them why this workspace exists.",
    tag: "Welcome",
    title: "What is Avenire?",
  },
  {
    content: [
      {
        detail: "PDFs, notes, textbooks, past papers.",
        label: "Accepted files",
      },
      {
        detail: "Handwritten notes and whiteboard photos.",
        label: "Visuals",
      },
      {
        detail: "Lecture recordings, then OCR -> chunk -> embed -> index.",
        label: "Video sources",
      },
    ],
    id: "upload",
    note: "Let people skip this if they want to keep moving with demo material. Friction here hurts activation.",
    skippable: true,
    step: 2,
    subtitle: "Where Avenire earns trust with ingestion and indexing.",
    tag: "Upload",
    title: "Bring your material",
  },
  {
    content: [
      {
        detail: "Apollo asks targeted concept checks from your material.",
        label: "3-question probe",
      },
      {
        detail: "Wrong answers become misconceptions with concept tags.",
        label: "Misconception capture",
      },
      {
        detail: "Weak-point maps make the hidden gaps visible.",
        label: "Confidence map",
      },
    ],
    id: "misconceptions",
    note: "This is the moment the product gets specific. It should feel like the system saw something the student missed.",
    skippable: false,
    step: 3,
    subtitle: "Surface the gap before you ask them to study harder.",
    tag: "Misconceptions",
    title: "Find the broken model",
  },
  {
    content: [
      {
        detail:
          "Review load stays sustainable when the calendar is doing the work.",
        label: "7-day preview",
      },
      {
        detail: "Choose a review time that fits the student's day.",
        label: "Daily reminder",
      },
      {
        detail: "Start the first session immediately so the habit feels real.",
        label: "First session",
      },
    ],
    id: "review_loop",
    note: "This is the retention hook. The UI should make the review loop feel inevitable, not optional.",
    skippable: true,
    step: 4,
    subtitle: "Turn the first visit into a durable routine.",
    tag: "Review loop",
    title: "Lock in the habit",
  },
  {
    content: [
      {
        detail:
          "The mismatch between weak points and dashboard nudges is the payoff.",
        label: "Suggested task",
      },
      {
        detail: "Today’s cards and the note they started are already waiting.",
        label: "Immediate context",
      },
      {
        detail:
          "No dead-end empty states. The home screen should already be useful.",
        label: "Ready-made home",
      },
    ],
    id: "dashboard",
    note: "Day 1 should feel like day 10. This final state is a proof of utility, not a farewell screen.",
    skippable: false,
    step: 5,
    subtitle: "Land them in a workspace that already knows what to do next.",
    tag: "Dashboard",
    title: "You're in. Here's your home.",
  },
];

export function getOnboardingStorageKey(workspaceUuid: string) {
  return `${ONBOARDING_STORAGE_PREFIX}:${workspaceUuid}`;
}

export function parseOnboardingMemory(input: string | null): OnboardingMemory {
  if (!input) {
    return EMPTY_ONBOARDING_MEMORY;
  }

  try {
    const parsed = JSON.parse(input) as Partial<OnboardingMemory>;
    const generatedCards = Array.isArray(parsed.generatedCards)
      ? parsed.generatedCards
          .filter((card): card is GeneratedFlashcard => {
            return (
              typeof card === "object" &&
              card !== null &&
              typeof card.frontMarkdown === "string" &&
              typeof card.backMarkdown === "string" &&
              Array.isArray(card.tags) &&
              card.tags.every((tag) => typeof tag === "string")
            );
          })
          .slice(0, 12)
      : [];

    return {
      generatedCards,
      generatedMindsetTitle:
        typeof parsed.generatedMindsetTitle === "string"
          ? parsed.generatedMindsetTitle
          : null,
      generatedSetId:
        typeof parsed.generatedSetId === "string"
          ? parsed.generatedSetId
          : null,
      uploadAt: typeof parsed.uploadAt === "string" ? parsed.uploadAt : null,
      uploadFileName:
        typeof parsed.uploadFileName === "string"
          ? parsed.uploadFileName
          : null,
    };
  } catch {
    return EMPTY_ONBOARDING_MEMORY;
  }
}

export function memoryToMindsetCards(memory: OnboardingMemory) {
  return memory.generatedCards.map((card, index) => ({
    back: (
      <div className="space-y-3 text-center">
        <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
          Answer
        </p>
        <p className="whitespace-pre-wrap text-base text-foreground leading-7">
          {card.backMarkdown}
        </p>
      </div>
    ),
    front: (
      <div className="space-y-3 text-center">
        <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
          Prompt
        </p>
        <p className="whitespace-pre-wrap text-base text-foreground leading-7">
          {card.frontMarkdown}
        </p>
      </div>
    ),
    id: card.id ?? `${memory.generatedSetId ?? "generated"}-${index}`,
    meta: card.notesMarkdown ? (
      <span className="text-muted-foreground">Notes available for review</span>
    ) : (
      <span className="text-muted-foreground">Ready for study</span>
    ),
    title: card.tags[0] ?? `Card ${index + 1}`,
  }));
}

export function getOnboardingSourceMisconception(
  activeMisconceptions: MisconceptionRecord[],
  weakPointGroups: WeakPointGroup[]
): OnboardingSourceMisconception {
  const firstWeakPoint = weakPointGroups[0];
  const activeMisconception = activeMisconceptions[0];

  if (activeMisconception) {
    return {
      concept: activeMisconception.concept,
      reason: activeMisconception.reason,
      subject: activeMisconception.subject,
      topic: activeMisconception.topic,
    };
  }

  return {
    concept: firstWeakPoint?.topic ?? "Concept check",
    reason: firstWeakPoint
      ? `${firstWeakPoint.subject} / ${firstWeakPoint.topic}`
      : "This concept surfaced during onboarding.",
    subject: firstWeakPoint?.subject ?? "General",
    topic: firstWeakPoint?.topic ?? "Review",
  };
}
