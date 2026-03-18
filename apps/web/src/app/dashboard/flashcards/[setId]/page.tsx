import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlashcardSetDetail } from "@/components/flashcards/set-detail";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import {
  getFlashcardSetForUser,
  listDueFlashcardsForUser,
} from "@/lib/flashcards";

export default async function DashboardFlashcardSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const { setId } = await params;
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

  const [set, queue] = await Promise.all([
    getFlashcardSetForUser(session.user.id, workspace.workspaceId, setId),
    listDueFlashcardsForUser({
      limit: 20,
      setId,
      userId: session.user.id,
      workspaceId: workspace.workspaceId,
    }),
  ]);

  if (!set) {
    redirect("/dashboard/flashcards" as Route);
  }

  return <FlashcardSetDetail initialQueue={queue} initialSet={set} />;
}
