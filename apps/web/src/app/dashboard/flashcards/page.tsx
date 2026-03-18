import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlashcardsDashboard } from "@/components/flashcards/dashboard";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { getFlashcardDashboardForUser } from "@/lib/flashcards";

export default async function DashboardFlashcardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );

  if (!workspace) {
    redirect("/dashboard");
  }

  const dashboard = await getFlashcardDashboardForUser(
    session.user.id,
    workspace.workspaceId
  );

  if (!dashboard) {
    redirect("/dashboard");
  }

  return <FlashcardsDashboard initialDashboard={dashboard} />;
}
