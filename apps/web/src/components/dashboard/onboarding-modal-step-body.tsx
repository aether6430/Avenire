"use client";

import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";
import type { WeakPointGroup } from "./dashboard-home-model";
import { DashboardStep } from "./onboarding-modal-dashboard-step";
import { MisconceptionsStep } from "./onboarding-modal-misconceptions-step";
import type {
  GeneratedMindsetState,
  OnboardingMemory,
  OnboardingStepDefinition,
  UploadPhase,
} from "./onboarding-modal-model";
import { ReviewLoopStep } from "./onboarding-modal-review-loop-step";
import { StepPanels } from "./onboarding-modal-step-panels";
import { UploadStep } from "./onboarding-modal-upload-step";
import { WelcomeStep } from "./onboarding-modal-welcome-step";

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
