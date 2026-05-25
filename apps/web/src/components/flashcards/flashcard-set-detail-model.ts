import type {
  FlashcardDisplayState,
  FlashcardEnrollmentStatus,
  FlashcardTaxonomy,
} from "@/lib/flashcards";

export type Rating = "again" | "hard" | "good" | "easy";
export type StudyStatus = "idle" | "loading" | "ready" | "error";

export const RATING_STYLES: Record<Rating, string> = {
  again:
    "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:border-rose-300/45 dark:hover:bg-rose-500/16",
  easy: "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:border-sky-300/45 dark:hover:bg-sky-500/16",
  good: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:border-emerald-300/45 dark:hover:bg-emerald-500/16",
  hard: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-300/45 dark:hover:bg-amber-500/16",
};

export const FRONT_FACE_MAX_FONT_SIZE = 18;
export const FRONT_FACE_MIN_FONT_SIZE = 12;
export const BACK_FACE_MAX_FONT_SIZE = 15;
export const BACK_FACE_MIN_FONT_SIZE = 11;

export const STATE_LABELS: Record<FlashcardDisplayState, string> = {
  killed: "Killed",
  learning: "Learning",
  mature: "Mature",
  new: "New",
  relearning: "Relearning",
  suspended: "Suspended",
  young: "Young",
};

export const STATE_STYLES: Record<FlashcardDisplayState, string> = {
  killed:
    "border-rose-200/70 bg-rose-100/70 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200",
  learning:
    "border-amber-200/70 bg-amber-100/70 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
  mature:
    "border-emerald-200/70 bg-emerald-100/70 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  new: "border-zinc-200/70 bg-zinc-100/70 text-zinc-700 dark:border-zinc-400/30 dark:bg-zinc-500/10 dark:text-zinc-200",
  relearning:
    "border-orange-200/70 bg-orange-100/70 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200",
  suspended:
    "border-stone-200/70 bg-stone-100/70 text-stone-700 dark:border-stone-400/30 dark:bg-stone-500/10 dark:text-stone-200",
  young:
    "border-teal-200/70 bg-teal-100/70 text-teal-700 dark:border-teal-400/30 dark:bg-teal-500/10 dark:text-teal-200",
};

export function readFlashcardTaxonomyField(
  source: Record<string, unknown>,
  key: "subject" | "topic" | "concept"
) {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function buildFlashcardDrillQuery(filters: FlashcardTaxonomy[]) {
  const params = new URLSearchParams();
  for (const filter of filters) {
    params.append("drill", JSON.stringify(filter));
  }
  return params.toString();
}

export function getFlashcardEnrollmentLabel(
  status: FlashcardEnrollmentStatus | null | undefined
) {
  if (status === "active") {
    return "Study active";
  }

  if (status === "paused") {
    return "Paused";
  }

  return "Not enrolled";
}
