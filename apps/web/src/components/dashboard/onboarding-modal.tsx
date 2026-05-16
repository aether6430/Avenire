"use client";

import type { OnboardingModalProps } from "./onboarding-modal-model";
import { OnboardingModalSurface } from "./onboarding-modal-surface";
import { useOnboardingModal } from "./use-onboarding-modal";

export function OnboardingModal(props: OnboardingModalProps) {
  const runtime = useOnboardingModal(props);

  return <OnboardingModalSurface {...props} runtime={runtime} />;
}
