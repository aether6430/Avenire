import type {
  ConceptDrillTarget,
  ConceptMasteryRecord,
  FlashcardSetSummary,
  FlashcardTaxonomy,
} from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";

export interface DashboardHomeProps {
  activeMisconceptions: MisconceptionRecord[];
  currentUserId: string;
  flashcardSets: FlashcardSetSummary[];
  rootFolderId: string;
  userName?: string;
  weakestConcepts: ConceptMasteryRecord[];
  weakestDrillTarget: ConceptDrillTarget | null;
  workspaceId: string;
}

export interface ActivityEvent {
  action: "created" | "updated" | "reviewed";
  createdAt: string;
  href: string;
  id: string;
  subtitle?: string;
  title: string;
  type: "chat" | "file" | "flashcard" | "note";
}

export interface WeakPointGroup {
  concepts: ConceptMasteryRecord[];
  misconceptionCount: number;
  subject: string;
  topic: string;
}

export function getDashboardActivityStateMessage(input: {
  activityCount: number;
  loadFailed: boolean;
  loading: boolean;
}) {
  if (input.loading) {
    return {
      message: "Loading activity...",
      showSpinner: true,
    };
  }

  if (input.loadFailed && input.activityCount === 0) {
    return {
      message: "Unable to load activity.",
      showSpinner: false,
    };
  }

  if (input.activityCount === 0) {
    return {
      message: "No recent activity.",
      showSpinner: false,
    };
  }

  return null;
}

export function buildDashboardDrillQuery(concepts: FlashcardTaxonomy[]) {
  const params = new URLSearchParams();
  for (const concept of concepts) {
    params.append("drill", JSON.stringify(concept));
  }
  return params.toString();
}

export function formatDashboardRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return then.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function groupDashboardWeakPoints(
  concepts: ConceptMasteryRecord[],
  misconceptions: MisconceptionRecord[]
) {
  const byTopic = new Map<string, WeakPointGroup>();

  for (const concept of concepts) {
    const key = `${concept.subject}::${concept.topic}`;
    const existing = byTopic.get(key) ?? {
      concepts: [],
      misconceptionCount: 0,
      subject: concept.subject,
      topic: concept.topic,
    };
    existing.concepts.push(concept);
    existing.concepts.sort((left, right) => left.score - right.score);
    existing.misconceptionCount = misconceptions.filter(
      (item) =>
        item.subject === concept.subject &&
        item.topic === concept.topic &&
        item.active
    ).length;
    byTopic.set(key, existing);
  }

  return Array.from(byTopic.values()).sort((left, right) => {
    const leftScore =
      left.concepts.reduce((sum, concept) => sum + concept.score, 0) /
      Math.max(left.concepts.length, 1);
    const rightScore =
      right.concepts.reduce((sum, concept) => sum + concept.score, 0) /
      Math.max(right.concepts.length, 1);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return `${left.subject}::${left.topic}`.localeCompare(
      `${right.subject}::${right.topic}`
    );
  });
}

export function buildMisconceptionTutorPrompt(
  misconception: MisconceptionRecord
) {
  return encodeURIComponent(
    `Help me fix this misconception.\n\nConcept: ${misconception.concept}\nSubject: ${misconception.subject}\nTopic: ${misconception.topic}\nReason: ${misconception.reason}\n\nFirst check the current misconception context, then teach the correct model, and test me with a few questions.`
  );
}

export function buildMisconceptionFlashcardPrompt(
  misconception: MisconceptionRecord
) {
  return encodeURIComponent(
    `Generate a mindset set from this misconception and focus on correcting the wrong model.\n\nConcept: ${misconception.concept}\nSubject: ${misconception.subject}\nTopic: ${misconception.topic}\nReason: ${misconception.reason}\n\nUse the misconception tools if needed, then create the mindset set from the wrong model and the corrected model.`
  );
}
