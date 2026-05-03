import { OnboardingPageClient } from "@/components/auth/onboarding-page-client";
import { getUserSettings } from "@/lib/user-settings";
import { getSessionUser } from "@/lib/workspace";
import { buildPageMetadata } from "@/lib/page-metadata";
import { redirect } from "next/navigation";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/onboarding",
  title: "Onboarding",
});

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackURL=/onboarding");
  }

  const settings = await getUserSettings(user.id);
  if (settings.onboardingCompleted) {
    redirect("/workspace");
  }

  return <OnboardingPageClient />;
}
