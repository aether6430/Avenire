import { listSessionSummariesForUser } from "@avenire/database";
import { getFlashcardDashboardForUser, listMasterySubjectsForUser } from "@/lib/flashcards";
import { getActiveMisconceptions } from "@/lib/learning-data";

type StudentProfile = {
  dynamic: {
    active_misconceptions: string[];
    cards_due_today: number;
    studied_last_7_days: string[];
  };
  static: {
    avg_session_length_mins: number | null;
    strong_subjects: string[];
    weak_subjects: string[];
  };
};

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function averageSessionLengthMins(
  summaries: Array<{ endedAt: string; startedAt: string }>
): number | null {
  const durations = summaries
    .map((summary) => {
      const startedAt = new Date(summary.startedAt).getTime();
      const endedAt = new Date(summary.endedAt).getTime();
      const durationMs = endedAt - startedAt;
      return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
    })
    .filter((value): value is number => value !== null);

  if (durations.length === 0) {
    return null;
  }

  const avgMs =
    durations.reduce((total, duration) => total + duration, 0) / durations.length;
  return Math.round(avgMs / 60000);
}

export async function buildStudentProfileContext(input: {
  userId: string;
  workspaceId: string;
}): Promise<string | null> {
  const [dashboard, subjects, misconceptions, summaries] = await Promise.all([
    getFlashcardDashboardForUser(input.userId, input.workspaceId),
    listMasterySubjectsForUser(input.userId, input.workspaceId, 8),
    getActiveMisconceptions({
      limit: 6,
      userId: input.userId,
      workspaceId: input.workspaceId,
    }),
    listSessionSummariesForUser({
      limit: 12,
      userId: input.userId,
      workspaceId: input.workspaceId,
    }),
  ]);

  if (!dashboard && subjects.length === 0 && misconceptions.length === 0) {
    return null;
  }

  const cutoff = Date.now() - RECENT_WINDOW_MS;
  const sortedSubjects = subjects.slice().sort((left, right) => {
    if (left.averageScore !== right.averageScore) {
      return right.averageScore - left.averageScore;
    }

    return right.reviewCount - left.reviewCount;
  });

  const profile: StudentProfile = {
    static: {
      strong_subjects: sortedSubjects.slice(0, 3).map((subject) => subject.subject),
      weak_subjects: sortedSubjects
        .slice()
        .reverse()
        .slice(0, 3)
        .map((subject) => subject.subject),
      avg_session_length_mins: averageSessionLengthMins(summaries),
    },
    dynamic: {
      active_misconceptions: misconceptions
        .slice()
        .sort((left, right) => right.confidence - left.confidence)
        .slice(0, 5)
        .map((misconception) => misconception.concept),
      studied_last_7_days: subjects
        .filter((subject) => {
          if (!subject.lastReviewedAt) {
            return false;
          }

          return new Date(subject.lastReviewedAt).getTime() >= cutoff;
        })
        .slice(0, 5)
        .map((subject) => subject.subject),
      cards_due_today: dashboard?.dueCount ?? 0,
    },
  };

  return ["<student_context>", JSON.stringify(profile, null, 2), "</student_context>"].join(
    "\n"
  );
}
