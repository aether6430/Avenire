"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EMPTY_ONBOARDING_MEMORY,
  getOnboardingStorageKey,
  ONBOARDING_STEPS,
  type OnboardingMemory,
  type OnboardingModalProps,
  parseOnboardingMemory,
} from "@/components/dashboard/onboarding-modal-model";
import { useOnboardingGeneration } from "@/components/dashboard/use-onboarding-generation";
import { useOnboardingUpload } from "@/components/dashboard/use-onboarding-upload";

export interface OnboardingModalRuntime {
  activeStepIndex: number;
  direction: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  generateFlashcards: () => Promise<void>;
  generationError: string | null;
  generationStatus: ReturnType<
    typeof useOnboardingGeneration
  >["generationStatus"];
  goTo: (nextIndex: number) => void;
  handleBack: () => void;
  handleNext: () => void;
  handleUploadSelection: ReturnType<
    typeof useOnboardingUpload
  >["handleUploadSelection"];
  isLast: boolean;
  memory: OnboardingMemory;
  pickUpload: () => void;
  step: (typeof ONBOARDING_STEPS)[number];
  uploadMessage: string | null;
  uploadName: string | null;
  uploadPhase: ReturnType<typeof useOnboardingUpload>["uploadPhase"];
}

export function useOnboardingModal({
  activeMisconceptions,
  onComplete,
  open,
  rootFolderId,
  setOnboardingStep,
  stepIndex,
  weakPointGroups,
  workspaceUuid,
}: OnboardingModalProps): OnboardingModalRuntime {
  const router = useRouter();
  const [direction, setDirection] = useState(1);
  const [memory, setMemory] = useState<OnboardingMemory>(
    EMPTY_ONBOARDING_MEMORY
  );
  const [memoryReady, setMemoryReady] = useState(false);
  const activeStepIndex = Math.min(stepIndex, ONBOARDING_STEPS.length - 1);
  const step = ONBOARDING_STEPS[activeStepIndex] ?? ONBOARDING_STEPS[0];
  const isLast = activeStepIndex === ONBOARDING_STEPS.length - 1;
  const upload = useOnboardingUpload({
    rootFolderId,
    router,
    setMemory,
    workspaceUuid,
  });
  const {
    fileInputRef,
    handleUploadSelection,
    pickUpload,
    uploadMessage,
    uploadName,
    uploadPhase,
  } = upload;
  const generation = useOnboardingGeneration({
    activeMisconceptions,
    setMemory,
    weakPointGroups,
  });
  const {
    generateFlashcards,
    generationError,
    generationStatus,
    setGenerationStatus,
  } = generation;

  useEffect(() => {
    setMemory(EMPTY_ONBOARDING_MEMORY);
    setMemoryReady(false);

    if (!workspaceUuid) {
      setMemoryReady(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem(
        getOnboardingStorageKey(workspaceUuid)
      );
      const parsed = parseOnboardingMemory(stored);
      setMemory(parsed);
      setGenerationStatus(parsed.generatedCards.length > 0 ? "ready" : "idle");
    } catch {
      setMemory(EMPTY_ONBOARDING_MEMORY);
      setGenerationStatus("idle");
    } finally {
      setMemoryReady(true);
    }
  }, [workspaceUuid, setGenerationStatus]);

  useEffect(() => {
    if (!(memoryReady && workspaceUuid)) {
      return;
    }

    try {
      window.localStorage.setItem(
        getOnboardingStorageKey(workspaceUuid),
        JSON.stringify(memory)
      );
    } catch {
      // Ignore storage failures and keep the in-memory state alive.
    }
  }, [memory, memoryReady, workspaceUuid]);

  useEffect(() => {
    if (open) {
      setDirection(1);
    }
  }, [open]);

  useEffect(() => {
    if (activeStepIndex >= ONBOARDING_STEPS.length) {
      setOnboardingStep(ONBOARDING_STEPS.length - 1);
    }
  }, [activeStepIndex, setOnboardingStep]);

  const goTo = (nextIndex: number) => {
    const targetIndex = Math.max(
      0,
      Math.min(nextIndex, ONBOARDING_STEPS.length - 1)
    );
    setDirection(targetIndex > activeStepIndex ? 1 : -1);
    setOnboardingStep(targetIndex);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete().catch(() => undefined);
      return;
    }
    goTo(activeStepIndex + 1);
  };

  const handleBack = () => {
    if (activeStepIndex > 0) {
      goTo(activeStepIndex - 1);
    }
  };

  return {
    activeStepIndex,
    direction,
    fileInputRef,
    generateFlashcards,
    generationError,
    generationStatus,
    goTo,
    handleBack,
    handleNext,
    handleUploadSelection,
    isLast,
    memory,
    pickUpload,
    step,
    uploadMessage,
    uploadName,
    uploadPhase,
  };
}
