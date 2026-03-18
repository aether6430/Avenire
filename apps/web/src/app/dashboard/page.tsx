import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard/overview";
import { listChatsForUser } from "@/lib/chat-data";
import { listWorkspaceFiles, resolveWorkspaceForUser } from "@/lib/file-data";
import {
  listFlashcardReviewCountsByDayForUser,
  listFlashcardSetSummariesForUser,
} from "@/lib/flashcards";

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

export default async function DashboardPage() {
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
    redirect("/dashboard/chats" as Route);
  }

  const startDate = addUtcDays(startOfUtcDay(new Date()), -29);
  const [chats, files, flashcardSets, reviewCounts] = await Promise.all([
    listChatsForUser(session.user.id, workspace.workspaceId),
    listWorkspaceFiles(workspace.workspaceId, session.user.id),
    listFlashcardSetSummariesForUser(session.user.id, workspace.workspaceId),
    listFlashcardReviewCountsByDayForUser(
      session.user.id,
      workspace.workspaceId,
      startDate
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

  return (
    <DashboardOverview
      chats={chats}
      files={files}
      flashcardSets={flashcardSets}
      studySessions={studySessions}
      userName={session.user.name ?? undefined}
    />
  );
}
