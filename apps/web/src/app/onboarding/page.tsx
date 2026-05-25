import { getUserSettings } from "@avenire/database";
import { redirect } from "next/navigation";
import { OnboardingPageClient } from "@/components/auth/onboarding-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/onboarding",
  title: "Onboarding",
});

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getRouteSession();

  if (!session?.user) {
    redirect("/login?callbackURL=/onboarding");
  }

  const settings = await getUserSettings(session.user.id);

  if (settings.onboardingCompleted) {
    redirect("/workspace");
  }

  return <OnboardingPageClient />;
}
