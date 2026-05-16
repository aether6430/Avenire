"use client";

import { useState } from "react";
import type {
  GeneratedMindsetState,
  OnboardingMemory,
  OnboardingSourceMisconception,
  WeakPointGroup,
} from "@/components/dashboard/onboarding-modal-model";
import { getOnboardingSourceMisconception } from "@/components/dashboard/onboarding-modal-model";
import type { MisconceptionRecord } from "@/lib/learning-data";

export function useOnboardingGeneration({
  activeMisconceptions,
  setMemory,
  weakPointGroups,
}: {
  activeMisconceptions: MisconceptionRecord[];
  setMemory: React.Dispatch<React.SetStateAction<OnboardingMemory>>;
  weakPointGroups: WeakPointGroup[];
}) {
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GeneratedMindsetState>("idle");

  const generateFlashcards = async () => {
    const sourceMisconception: OnboardingSourceMisconception =
      getOnboardingSourceMisconception(activeMisconceptions, weakPointGroups);

    setGenerationStatus("loading");
    setGenerationError(null);

    const request = {
      concept: sourceMisconception.concept,
      count: 5,
      reason: sourceMisconception.reason,
      subject: sourceMisconception.subject,
      title: `${sourceMisconception.concept} mindset`,
      topic: sourceMisconception.topic,
    };

    try {
      const response = await fetch("/api/flashcards/onboarding", {
        body: JSON.stringify(request),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Unable to generate mindset.");
      }

      const payload = (await response.json()) as {
        cards?: OnboardingMemory["generatedCards"];
        set?: { id?: string; title?: string };
      };
      const cards = Array.isArray(payload.cards) ? payload.cards : [];
      if (cards.length === 0) {
        throw new Error("Mindset generation returned no cards.");
      }

      setMemory((current) => ({
        ...current,
        generatedCards: cards.slice(0, 12),
        generatedMindsetTitle:
          payload.set?.title ?? request.title ?? current.generatedMindsetTitle,
        generatedSetId: payload.set?.id ?? current.generatedSetId,
      }));
      setGenerationStatus("ready");
    } catch (error) {
      setGenerationStatus("error");
      setGenerationError(
        error instanceof Error ? error.message : "Unable to generate mindset."
      );
    }
  };

  return {
    generateFlashcards,
    generationError,
    generationStatus,
    setGenerationStatus,
  };
}
