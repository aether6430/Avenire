import { redirect } from "next/navigation";
import { WaitlistPageClient } from "@/components/auth/waitlist-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getUserSettings } from "@/lib/user-settings";
import { getRouteSession } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  description:
    "Join the Avenire waitlist for early access to an AI learning workspace built for deep study and research.",
  path: "/waitlist",
  title: "Join the waitlist",
});

export default async function WaitlistPage() {
  const session = await getRouteSession();

  if (session?.user) {
    const settings = await getUserSettings(session.user.id);
    redirect(settings.onboardingCompleted ? "/workspace" : "/onboarding");
  }

  return <WaitlistPageClient />;
}
