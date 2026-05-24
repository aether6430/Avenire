import { redirect } from "next/navigation";
import { WaitlistPageClient } from "@/components/auth/waitlist-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getWorkspaceRouteContext } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  description:
    "Join the Avenire waitlist for early access to an AI learning workspace built for deep study and research.",
  path: "/waitlist",
  title: "Join the waitlist",
});

export default async function WaitlistPage() {
  const { session, workspace } = await getWorkspaceRouteContext();

  if (session?.user) {
    if (workspace) {
      redirect("/workspace");
    }

    const { getUserSettings } = await import("@avenire/database");
    const settings = await getUserSettings(session.user.id);
    redirect(settings.onboardingCompleted ? "/workspace" : "/onboarding");
  }

  return <WaitlistPageClient />;
}
