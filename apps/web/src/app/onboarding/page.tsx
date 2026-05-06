import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { OnboardingPageClient } from "@/components/auth/onboarding-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getUserOnboardingCompleted } from "@/lib/user-settings";
import { getSessionUser } from "@/lib/workspace";

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

  const onboardingCompleted = await getUserOnboardingCompleted(user.id).catch(
    (error) => {
      console.error("[onboarding] Failed to load onboarding status", error);
      return false;
    }
  );
  if (onboardingCompleted) {
    redirect("/workspace");
  }

  const requestHeaders = await headers();
  const countryCode =
    requestHeaders.get("x-vercel-ip-country") ??
    requestHeaders.get("cf-ipcountry") ??
    requestHeaders.get("x-country-code");

  return <OnboardingPageClient countryCode={countryCode} />;
}
