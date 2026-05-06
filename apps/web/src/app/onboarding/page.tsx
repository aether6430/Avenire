import { OnboardingPageClient } from "@/components/auth/onboarding-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/onboarding",
  title: "Onboarding",
});

export const dynamic = "force-static";

export default function OnboardingPage() {
  return <OnboardingPageClient />;
}
