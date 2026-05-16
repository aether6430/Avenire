export type OnboardingDashboardCardKind =
  | "chat-probe"
  | "mindset-set"
  | "review";

export interface OnboardingDashboardCard {
  action: string;
  bg: string;
  kind: OnboardingDashboardCardKind;
  sub: string;
  title: string;
}

export function getOnboardingDashboardCards(): OnboardingDashboardCard[] {
  return [
    {
      action: "Open Method",
      bg: "border-border/70 bg-background",
      kind: "chat-probe",
      sub: "Gauss' Law · Electric Flux",
      title: "Fix your misconception",
    },
    {
      action: "Start Review",
      bg: "border-border/70 bg-background",
      kind: "review",
      sub: "Based on your FSRS schedule",
      title: "5 mindset cards due today",
    },
    {
      action: "Open Mindset Set",
      bg: "border-border/70 bg-background",
      kind: "mindset-set",
      sub: "Electrostatics - Chapter 1",
      title: "Revisit your mindset set",
    },
  ];
}
