import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import {
  type ConceptMasteryRecord,
  type ConceptMasterySubjectRecord,
  getConceptMasteryDashboardData,
  getFlashcardDashboardForUser,
  listFlashcardReviewCountsByDayForUser,
  listFlashcardSetSummariesForUser,
  resolveWeakestConceptDrillTarget,
} from "@/lib/flashcards";
import { getActiveMisconceptions } from "@/lib/learning-data";

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

const addUtcDays = (date: Date, days: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days
    )
  );

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
    redirect("/workspace/chats" as Route);
  }

  const query = await searchParams;
  const requestedSubject =
    typeof query.subject === "string" ? query.subject : undefined;
  const startDate = addUtcDays(startOfUtcDay(new Date()), -29);
  const emptyMastery: {
    concepts: ConceptMasteryRecord[];
    selectedSubject: null,
    subjects: ConceptMasterySubjectRecord[];
    weakestConcepts: ConceptMasteryRecord[];
  } = {
    concepts: [],
    selectedSubject: null,
    subjects: [],
    weakestConcepts: [],
  };
  const [
    flashcardSets,
    reviewCounts,
    mastery,
    activeMisconceptions,
    flashcardDashboard,
  ] = await Promise.all([
    listFlashcardSetSummariesForUser(session.user.id, workspace.workspaceId),
    listFlashcardReviewCountsByDayForUser(
      session.user.id,
      workspace.workspaceId,
      startDate
    ),
    getConceptMasteryDashboardData(
      session.user.id,
      workspace.workspaceId,
      requestedSubject
    ).catch((error) => {
      console.error("[dashboard] Failed to load concept mastery data", {
        error,
        userId: session.user.id,
        workspaceId: workspace.workspaceId,
      });
      return emptyMastery;
      }),
    getActiveMisconceptions({
      limit: 12,
      userId: session.user.id,
      workspaceId: workspace.workspaceId,
      subject: requestedSubject,
    }).catch((error) => {
      console.error("[dashboard] Failed to load active misconceptions", {
        error,
        userId: session.user.id,
        workspaceId: workspace.workspaceId,
      });
      return [];
    }),
    getFlashcardDashboardForUser(session.user.id, workspace.workspaceId).catch(
      (error) => {
        console.error("[dashboard] Failed to load flashcard dashboard data", {
          error,
          userId: session.user.id,
          workspaceId: workspace.workspaceId,
        });
        return null;
      }
    ),
  ]);

  const countByDay = new Map(
    reviewCounts.map((entry) => [entry.day, entry.count])
  );
  const studySessions = Array.from({ length: 30 }, (_, index) => {
    const day = addUtcDays(startDate, index).toISOString().slice(0, 10);
    return {
      day,
      count: countByDay.get(day) ?? 0,
    };
  });
  const weakestDrillTarget = flashcardDashboard
    ? resolveWeakestConceptDrillTarget(
        flashcardDashboard,
        mastery.weakestConcepts
      )
    : null;

  return (
    <DashboardHome
      chats={[]}
      files={[]}
      flashcardSets={flashcardSets}
      activeMisconceptions={activeMisconceptions}
      masteryConcepts={mastery.concepts}
      masterySelectedSubject={mastery.selectedSubject}
      masterySubjects={mastery.subjects}
      studySessions={studySessions}
      userName={session.user.name ?? undefined}
      weakestConcepts={mastery.weakestConcepts}
      weakestDrillTarget={weakestDrillTarget}
    />
  );
}
