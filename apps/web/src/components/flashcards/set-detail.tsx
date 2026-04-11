"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avenire/ui/components/table";
import { Textarea } from "@avenire/ui/components/textarea";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpenText as BookOpenCheck,
  Pause,
  Pencil,
  Plus,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlashcardArray,
  type IFlashcard,
  useFlashcardArray,
} from "react-quizlet-flashcard";
import { Markdown } from "@/components/chat/markdown";
import {
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
} from "@/components/dashboard/header-portal";
import { writeCachedFlashcardSet } from "@/lib/flashcard-browser-cache";
import type {
  FlashcardCardRecord,
  FlashcardDisplayState,
  FlashcardEnrollmentStatus,
  FlashcardReviewQueueItem,
  FlashcardSetRecord,
  FlashcardTaxonomy,
} from "@/lib/flashcards";
import { useWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";

type Rating = "again" | "hard" | "good" | "easy";
type StudyStatus = "idle" | "loading" | "ready" | "error";
const RATING_STYLES: Record<Rating, string> = {
  again:
    "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:border-rose-300/45 dark:hover:bg-rose-500/16",
  easy: "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:border-sky-300/45 dark:hover:bg-sky-500/16",
  good: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:border-emerald-300/45 dark:hover:bg-emerald-500/16",
  hard: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-300/45 dark:hover:bg-amber-500/16",
};

const FRONT_FACE_MAX_FONT_SIZE = 18;
const FRONT_FACE_MIN_FONT_SIZE = 12;
const BACK_FACE_MAX_FONT_SIZE = 15;
const BACK_FACE_MIN_FONT_SIZE = 11;

const STATE_LABELS: Record<FlashcardDisplayState, string> = {
  killed: "Killed",
  learning: "Learning",
  mature: "Mature",
  new: "New",
  relearning: "Relearning",
  suspended: "Suspended",
  young: "Young",
};

const STATE_STYLES: Record<FlashcardDisplayState, string> = {
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

function readTaxonomyField(
  source: Record<string, unknown>,
  key: "subject" | "topic" | "concept"
) {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function stateBadge(state: FlashcardDisplayState) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px]",
        STATE_STYLES[state]
      )}
    >
      {STATE_LABELS[state]}
    </span>
  );
}

function buildDrillQuery(filters: FlashcardTaxonomy[]) {
  const params = new URLSearchParams();
  for (const filter of filters) {
    params.append("drill", JSON.stringify(filter));
  }
  return params.toString();
}

function getEnrollmentLabel(
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

function StudyCardFace({
  align = "center",
  content,
  id,
  notes,
}: {
  align?: "center" | "left";
  content: string;
  id: string;
  notes?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(
    align === "center" ? FRONT_FACE_MAX_FONT_SIZE : BACK_FACE_MAX_FONT_SIZE
  );

  useEffect(() => {
    const container = containerRef.current;
    const contentNode = contentRef.current;
    if (!(container && contentNode)) {
      return;
    }

    let frame = 0;
    let observer: ResizeObserver | null = null;
    const maxFontSize =
      align === "center" ? FRONT_FACE_MAX_FONT_SIZE : BACK_FACE_MAX_FONT_SIZE;
    const minFontSize =
      align === "center" ? FRONT_FACE_MIN_FONT_SIZE : BACK_FACE_MIN_FONT_SIZE;

    const fitContent = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextSize = (() => {
          for (let size = maxFontSize; size >= minFontSize; size -= 1) {
            contentNode.style.fontSize = `${size}px`;
            if (
              contentNode.scrollHeight <= container.clientHeight &&
              contentNode.scrollWidth <= container.clientWidth
            ) {
              return size;
            }
          }

          return minFontSize;
        })();

        contentNode.style.fontSize = `${nextSize}px`;
        setFontSize((current) => (current === nextSize ? current : nextSize));
      });
    };

    fitContent();

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(fitContent);
      observer.observe(container);
      observer.observe(contentNode);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [align, content, id, notes]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden",
        align === "center" ? "items-center justify-center" : "items-stretch"
      )}
      ref={containerRef}
    >
      <div
        className="w-full min-w-0 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6 sm:py-6"
        ref={contentRef}
        style={{ fontSize }}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[34rem] flex-col gap-4",
            align === "center"
              ? "min-h-full justify-center"
              : "min-h-fit justify-start"
          )}
        >
          <Markdown
            className={cn(
              "max-w-none text-card-foreground text-inherit leading-[1.6] [&_ol]:text-inherit [&_p]:text-inherit [&_strong]:text-inherit [&_ul]:text-inherit [&_pre.shiki]:rounded-xl [&_pre.shiki]:border [&_pre.shiki]:border-border [&_pre.shiki]:bg-secondary [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-border [&_code:not(pre_code)]:bg-secondary [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5",
              align === "center" &&
                "text-balance text-center [&_li]:text-left [&_p]:text-center"
            )}
            content={content}
            id={id}
            parseIncompleteMarkdown={false}
          />
          {notes ? (
            <div className="rounded-md border border-border/70 bg-muted/50 px-3 py-3">
              <p className="mb-2 font-medium text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
                Notes
              </p>
              <Markdown
                className="max-w-none text-[0.92em] text-card-foreground leading-[1.6] [&_pre.shiki]:rounded-xl [&_pre.shiki]:border [&_pre.shiki]:border-border [&_pre.shiki]:bg-secondary [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-border [&_code:not(pre_code)]:bg-secondary [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5"
                content={notes}
                id={`${id}-notes`}
                parseIncompleteMarkdown={false}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: existing page component; study flow is kept local to avoid refetch churn
export function FlashcardSetDetail({
  initialDrillFilters,
  initialQueue,
  initialSet,
  initialStudyOpen = false,
}: {
  initialDrillFilters: FlashcardTaxonomy[];
  initialQueue?: FlashcardReviewQueueItem[];
  initialSet: FlashcardSetRecord;
  initialStudyOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const recordRoute = useWorkspaceHistoryStore((state) => state.recordRoute);
  const [set, setSet] = useState(initialSet);
  const [studyDeck, setStudyDeck] = useState(initialQueue ?? []);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [setMetadataEditorOpen, setSetMetadataEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardCardRecord | null>(
    null
  );
  const [setTitle, setSetTitle] = useState(initialSet.title);
  const [setDescription, setSetDescription] = useState(
    initialSet.description ?? ""
  );
  const [frontMarkdown, setFrontMarkdown] = useState("");
  const [backMarkdown, setBackMarkdown] = useState("");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [concept, setConcept] = useState("");
  const [tags, setTags] = useState("");
  const [studyOpen, setStudyOpen] = useState(initialStudyOpen);
  const [studyRevealed, setStudyRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [studyStatus, setStudyStatus] = useState<StudyStatus>(
    (initialQueue ?? []).length > 0 ? "ready" : "idle"
  );
  const [studyError, setStudyError] = useState<string | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studySessionTotal, setStudySessionTotal] = useState(
    (initialQueue ?? []).length
  );
  const [studySessionReviewed, setStudySessionReviewed] = useState(0);

  useEffect(() => {
    recordRoute(pathname);
  }, [pathname, recordRoute]);
  const [drillFilters, _setDrillFilters] = useState(initialDrillFilters);
  const deferredSearch = useDeferredValue(search);
  const headerLeadingIcon = useMemo(
    () => <BookOpenCheck className="size-3.5" />,
    []
  );
  const headerBreadcrumbs = useMemo(
    () => (
      <div className="min-w-0">
        <p className="truncate text-muted-foreground text-sm">Mindset</p>
        <p className="truncate text-muted-foreground text-xs">{set.title}</p>
      </div>
    ),
    [set.title]
  );

  useEffect(() => {
    setSet(initialSet);
    setSetTitle(initialSet.title);
    setSetDescription(initialSet.description ?? "");
    writeCachedFlashcardSet(initialSet);
  }, [initialSet]);

  useEffect(() => {
    if (studyOpen) {
      return;
    }

    const nextQueue = initialQueue ?? [];
    setStudyDeck(nextQueue);
    setStudyStatus(nextQueue.length > 0 ? "ready" : "idle");
    setStudySessionTotal(nextQueue.length);
    setStudySessionReviewed(0);
    setStudyIndex(0);
  }, [initialQueue, studyOpen]);

  const snapshotByCardId = useMemo(
    () =>
      new Map(
        set.cardSnapshots.map((snapshot) => [snapshot.card.id, snapshot])
      ),
    [set.cardSnapshots]
  );
  const activeCard = studyDeck[studyIndex] ?? null;
  const filteredCards = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) {
      return set.cards;
    }

    return set.cards.filter((card) => {
      return (
        card.frontMarkdown.toLowerCase().includes(needle) ||
        card.backMarkdown.toLowerCase().includes(needle) ||
        (card.notesMarkdown ?? "").toLowerCase().includes(needle) ||
        card.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [deferredSearch, set.cards]);
  const reviewDeckCards = useMemo<Array<IFlashcard & { id: string }>>(
    () =>
      studyDeck.map((item) => ({
        id: item.card.id,
        back: {
          html: (
            <div data-side="back" key={`study-back-face-${item.card.id}`}>
              <StudyCardFace
                align="left"
                content={item.card.backMarkdown}
                id={`study-back-${item.card.id}`}
                notes={item.card.notesMarkdown}
              />
            </div>
          ),
        },
        front: {
          html: (
            <div data-side="front" key={`study-front-face-${item.card.id}`}>
              <StudyCardFace
                align="center"
                content={item.card.frontMarkdown}
                id={`study-front-${item.card.id}`}
              />
            </div>
          ),
        },
      })),
    [studyDeck]
  );
  const reviewArrayHook = useFlashcardArray({
    deckLength: reviewDeckCards.length,
    flipDirection: "rtl",
    onCardChange: (cardIndex) => setStudyIndex(cardIndex),
    onFlip: (_cardIndex, state) => setStudyRevealed(state === "back"),
    showControls: false,
    showCount: false,
    showProgressBar: false,
  });
  const flipReviewCard = reviewArrayHook.flipHook.flip;
  const resetReviewCardState = reviewArrayHook.flipHook.resetCardState;
  const setReviewCardIndex = reviewArrayHook.setCurrentCard;
  const setEnrollmentLabel = getEnrollmentLabel(set.enrollment?.status);
  const reviewSummary = `${set.dueCount} due · ${set.newCount} new · ${set.reviewCountToday} studied today`;
  const studyProgress = useMemo(() => {
    const total = studySessionTotal;
    const current = total > 0 ? Math.min(studyIndex + 1, total) : 0;

    return {
      current,
      percentage:
        total > 0 ? Math.round((studySessionReviewed / total) * 100) : 0,
      total,
    };
  }, [studyIndex, studySessionReviewed, studySessionTotal]);
  let studySessionContent = (
    <div className="rounded-xl border border-border/50 border-dashed bg-muted/20 px-5 py-10 text-center text-muted-foreground text-xs">
      No cards are queued right now.
    </div>
  );

  if (studyStatus === "loading") {
    studySessionContent = (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-10 text-center text-muted-foreground text-xs">
        Loading review queue…
      </div>
    );
  } else if (studyStatus === "error") {
    studySessionContent = (
      <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-5 py-10 text-center text-rose-700 text-xs dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
        {studyError ?? "Unable to start the review session."}
      </div>
    );
  } else if (studySessionTotal > 0 && !activeCard) {
    studySessionContent = (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-10 text-center">
        <p className="font-medium text-sm">Session complete</p>
        <p className="mt-2 text-muted-foreground text-xs">
          You reviewed all {studySessionTotal} cards in this session.
        </p>
      </div>
    );
  } else if (activeCard) {
    studySessionContent = (
      <div className="mx-auto flex w-full max-w-3xl items-center flex-col gap-8">
        <div className="flex items-end justify-between w-full gap-4 px-0.5">
          <div className="min-w-0">
            <p className="font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.22em]">
              Review Progress
            </p>
            <p className="mt-1 font-medium text-sm tabular-nums">
              {studyProgress.current}/{studyProgress.total}
            </p>
          </div>
          <div className="w-full max-w-44">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${studyProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
        <FlashcardArray
          deck={reviewDeckCards}
          flipArrayHook={reviewArrayHook}
        />
      </div>
    );
  }

  const loadSet = useCallback(async () => {
    const response = await fetch(`/api/flashcards/sets/${set.id}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { set?: FlashcardSetRecord };
    if (payload.set) {
      setSet(payload.set);
      setSetTitle(payload.set.title);
      setSetDescription(payload.set.description ?? "");
      writeCachedFlashcardSet(payload.set);
    }
  }, [set.id]);

  const saveSet = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/flashcards/sets/${set.id}`, {
        body: JSON.stringify({
          description: setDescription,
          title: setTitle,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        return;
      }

      setSetMetadataEditorOpen(false);
      await loadSet();
    } finally {
      setBusy(false);
    }
  };

  const deleteSet = async () => {
    if (!window.confirm(`Delete "${set.title}"? This will archive the set.`)) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/flashcards/sets/${set.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        return;
      }

      router.push("/workspace/flashcards" as Route);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const loadStudySession = useCallback(async () => {
    setStudyStatus("loading");
    setStudyError(null);
    try {
      const query = new URLSearchParams({
        limit: "100",
        setId: set.id,
      });
      const drillQuery = buildDrillQuery(drillFilters);
      if (drillQuery) {
        for (const [key, value] of new URLSearchParams(drillQuery).entries()) {
          query.append(key, value);
        }
      }

      const response = await fetch(
        `/api/flashcards/review/queue?${query.toString()}`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to load review queue");
      }

      const payload = (await response.json()) as {
        queue?: FlashcardReviewQueueItem[];
      };
      const nextDeck = payload.queue ?? [];
      setStudyDeck(nextDeck);
      setStudySessionTotal(nextDeck.length);
      setStudySessionReviewed(0);
      setStudyIndex(0);
      setStudyRevealed(false);
      resetReviewCardState();
      setReviewCardIndex(0);
      setStudyStatus("ready");
    } catch {
      setStudyDeck([]);
      setStudySessionTotal(0);
      setStudySessionReviewed(0);
      setStudyIndex(0);
      resetReviewCardState();
      setReviewCardIndex(0);
      setStudyError("Unable to load this review session right now.");
      setStudyStatus("error");
    }
  }, [drillFilters, resetReviewCardState, set.id, setReviewCardIndex]);

  useEffect(() => {
    if (!studyOpen) {
      return;
    }

    loadStudySession().catch(() => undefined);
  }, [loadStudySession, studyOpen]);

  const openEditor = (card?: FlashcardCardRecord) => {
    setEditingCard(card ?? null);
    setFrontMarkdown(card?.frontMarkdown ?? "");
    setBackMarkdown(card?.backMarkdown ?? "");
    setNotesMarkdown(card?.notesMarkdown ?? "");
    setSubject(card ? readTaxonomyField(card.source, "subject") : "");
    setTopic(card ? readTaxonomyField(card.source, "topic") : "");
    setConcept(card ? readTaxonomyField(card.source, "concept") : "");
    setTags(card?.tags.join(", ") ?? "");
    setEditorOpen(true);
  };

  const saveCard = async () => {
    setBusy(true);
    try {
      const payload = {
        backMarkdown,
        frontMarkdown,
        notesMarkdown,
        source: {
          ...(editingCard?.source ?? {}),
          concept,
          subject,
          topic,
        },
        tags: tags
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      };
      const response = await fetch(
        editingCard
          ? `/api/flashcards/cards/${editingCard.id}`
          : `/api/flashcards/sets/${set.id}/cards`,
        {
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          method: editingCard ? "PATCH" : "POST",
        }
      );

      if (!response.ok) {
        return;
      }

      setEditorOpen(false);
      setEditingCard(null);
      await Promise.all([
        loadSet(),
        studyOpen ? loadStudySession() : Promise.resolve(),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const archiveCard = async (cardId: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/flashcards/cards/${cardId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        return;
      }

      await Promise.all([
        loadSet(),
        studyOpen ? loadStudySession() : Promise.resolve(),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const toggleEnrollment = async () => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/flashcards/sets/${set.id}/enrollment`,
        {
          body: JSON.stringify({
            newCardsPerDay: set.enrollment?.newCardsPerDay ?? 20,
            status: set.enrollment?.status === "active" ? "paused" : "active",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      if (!response.ok) {
        return;
      }

      await Promise.all([
        loadSet(),
        studyOpen ? loadStudySession() : Promise.resolve(),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submitReview = useCallback(
    async (rating: Rating) => {
      if (!(activeCard && !reviewBusy)) {
        return;
      }

      setReviewBusy(true);
      setStudyError(null);
      try {
        const response = await fetch("/api/flashcards/review", {
          body: JSON.stringify({
            cardId: activeCard.card.id,
            rating,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("Failed to submit review");
        }

        setStudySessionReviewed((value) => value + 1);
        setStudyRevealed(false);
        resetReviewCardState();
        if (studyIndex < studyDeck.length - 1) {
          reviewArrayHook.nextCard();
        } else {
          setStudyIndex(studyDeck.length);
        }

        if (studyIndex >= studyDeck.length - 1) {
          await loadSet();
        }
      } catch {
        setStudyError("We couldn't record that rating. Try again.");
      } finally {
        setReviewBusy(false);
      }
    },
    [
      activeCard,
      loadSet,
      resetReviewCardState,
      reviewArrayHook,
      reviewBusy,
      studyDeck.length,
      studyIndex,
    ]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !studyOpen ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        flipReviewCard(studyRevealed ? "front" : "back");
      }

      const ratingMap: Record<string, Rating> = {
        Digit1: "again",
        Digit2: "hard",
        Digit3: "good",
        Digit4: "easy",
      };

      const rating = ratingMap[event.code];
      if (rating && studyRevealed && activeCard) {
        event.preventDefault();
        submitReview(rating).catch(() => undefined);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard, flipReviewCard, studyOpen, studyRevealed, submitReview]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <HeaderLeadingIcon>{headerLeadingIcon}</HeaderLeadingIcon>
        <HeaderBreadcrumbs>{headerBreadcrumbs}</HeaderBreadcrumbs>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div>
            <div className="gap-3 border-border/40 border-b pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md" variant="outline">
                      {set.sourceType === "ai-generated"
                        ? "AI-generated set"
                        : "Manual set"}
                    </Badge>
                    <Badge className="rounded-md" variant="outline">
                      {set.stateCounts.killed} killed
                    </Badge>
                  </div>
                  <div>
                    <h1 className="font-semibold text-xl tracking-tight">
                      {set.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      {set.description ?? "No description set for this deck."}
                    </p>
                  </div>
                  {drillFilters.length > 0 ? (
                    <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs dark:border-amber-400/20 dark:bg-amber-500/10">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Drill session
                      </p>
                      <p className="mt-1 text-amber-700 dark:text-amber-200">
                        Review is limited to canonical matches for these
                        concepts.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {drillFilters.map((filter) => (
                          <Badge
                            className="rounded-full border-amber-300/80 bg-background/80 text-[11px] text-amber-900 dark:border-amber-400/20 dark:bg-background/20 dark:text-amber-100"
                            key={`${filter.subject}:${filter.topic}:${filter.concept}`}
                            variant="outline"
                          >
                            {filter.concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Dialog
                    onOpenChange={setSetMetadataEditorOpen}
                    open={setMetadataEditorOpen}
                  >
                    <DialogTrigger render={<Button variant="outline" />}>
                      <Pencil className="size-4" />
                      Edit set
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Edit set</DialogTitle>
                        <DialogDescription>
                          Update the title and description for this set.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-set-title">Title</Label>
                          <Input
                            id="flashcard-set-title"
                            onChange={(event) =>
                              setSetTitle(event.target.value)
                            }
                            value={setTitle}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-set-description">
                            Description
                          </Label>
                          <Textarea
                            id="flashcard-set-description"
                            onChange={(event) =>
                              setSetDescription(event.target.value)
                            }
                            value={setDescription}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          disabled={busy || !setTitle.trim()}
                          onClick={saveSet}
                          type="button"
                        >
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={toggleEnrollment}
                    type="button"
                    variant="outline"
                  >
                    {set.enrollment?.status === "active" ? (
                      <>
                        <Pause className="size-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <BookOpenCheck className="size-4" />
                        Enable Study
                      </>
                    )}
                  </Button>
                  <Dialog onOpenChange={setEditorOpen} open={editorOpen}>
                    <DialogTrigger render={<Button />}>
                      <Plus className="size-4" />
                      Add Card
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl" largeWidth>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCard ? "Edit card" : "Add card"}
                        </DialogTitle>
                        <DialogDescription>
                          Markdown and KaTeX are supported on both sides of the
                          card.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-front">Front</Label>
                          <Textarea
                            id="flashcard-front"
                            onChange={(event) =>
                              setFrontMarkdown(event.target.value)
                            }
                            placeholder="State the Routh-Hurwitz criterion."
                            value={frontMarkdown}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-back">Back</Label>
                          <Textarea
                            id="flashcard-back"
                            onChange={(event) =>
                              setBackMarkdown(event.target.value)
                            }
                            placeholder="The number of right-half-plane roots equals the number of sign changes in the first column."
                            value={backMarkdown}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-notes">Notes</Label>
                          <Textarea
                            id="flashcard-notes"
                            onChange={(event) =>
                              setNotesMarkdown(event.target.value)
                            }
                            placeholder="Add a derivation, caveat, or worked example."
                            value={notesMarkdown}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-subject">Subject</Label>
                          <Input
                            id="flashcard-subject"
                            onChange={(event) => setSubject(event.target.value)}
                            placeholder="Chemistry"
                            value={subject}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="flashcard-topic">Topic</Label>
                            <Input
                              id="flashcard-topic"
                              onChange={(event) => setTopic(event.target.value)}
                              placeholder="Thermodynamics"
                              value={topic}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="flashcard-concept">Concept</Label>
                            <Input
                              id="flashcard-concept"
                              onChange={(event) =>
                                setConcept(event.target.value)
                              }
                              placeholder="Gibbs free energy"
                              value={concept}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="flashcard-tags">Tags</Label>
                          <Input
                            id="flashcard-tags"
                            onChange={(event) => setTags(event.target.value)}
                            placeholder="controls, exam-2"
                            value={tags}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          disabled={
                            busy ||
                            !frontMarkdown.trim() ||
                            !backMarkdown.trim() ||
                            !subject.trim() ||
                            !topic.trim() ||
                            !concept.trim()
                          }
                          onClick={saveCard}
                          type="button"
                        >
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    disabled={busy}
                    onClick={deleteSet}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="size-4" />
                    Delete set
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-foreground text-sm">Review</p>
              <p className="text-muted-foreground text-xs">{reviewSummary}</p>
            </div>
            <Button
              disabled={set.dueCount + set.newCount <= 0}
              onClick={() => {
                setStudyDeck([]);
                setStudyStatus("loading");
                setStudyError(null);
                setStudySessionReviewed(0);
                setStudySessionTotal(0);
                setStudyIndex(0);
                setStudyOpen(true);
              }}
              type="button"
              variant="outline"
            >
              {set.dueCount + set.newCount > 0
                ? "Start review"
                : "No cards queued"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-secondary/40 px-4 py-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                Deck profile
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="rounded-md" variant="outline">
                  {set.sourceType === "ai-generated"
                    ? "AI-generated"
                    : "Manual"}
                </Badge>
                <Badge className="rounded-md" variant="outline">
                  {setEnrollmentLabel}
                </Badge>
                <Badge className="rounded-md" variant="outline">
                  {set.cardCount} cards
                </Badge>
              </div>
              <p className="mt-3 text-muted-foreground text-xs">
                {set.stateCounts.killed} killed ·{" "}
                {set.stateCounts.learning + set.stateCounts.relearning} in
                progress
              </p>
            </div>
            <div className="rounded-md bg-secondary/40 px-4 py-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                Study context
              </p>
              <div className="mt-3 space-y-2 text-muted-foreground text-xs">
                <p>{set.reviewCountToday} studied today</p>
                <p>{set.reviewCount7d} reviews in the last 7 days</p>
                <p>
                  {set.lastStudiedAt
                    ? `Last studied ${new Date(set.lastStudiedAt).toLocaleDateString()}`
                    : "Not studied yet"}
                </p>
                <p>Updated {new Date(set.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <Dialog
            onOpenChange={(open) => {
              setStudyOpen(open);
              if (!open) {
                resetReviewCardState();
                setReviewCardIndex(0);
                setStudyRevealed(false);
                setStudyIndex(0);
                setStudyStatus(studyDeck.length > 0 ? "ready" : "idle");
                if (studySessionReviewed > 0) {
                  loadSet().catch(() => undefined);
                }
              }
            }}
            open={studyOpen}
          >
            <DialogContent
              className="h-[100dvh] w-full overflow-hidden border-border/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_42%),var(--background)] p-0 sm:h-[88vh] sm:w-[min(42rem,calc(100vw-1.5rem))]"
              largeWidth
            >
              <div className="relative flex h-full flex-col overflow-hidden bg-background">
                <DialogHeader className="border-border/20 border-b px-4 py-2.5 sm:px-5 sm:py-4">
                  <div className="space-y-1.5 pr-8">
                    <p className="font-medium text-[0.7rem] text-muted-foreground uppercase tracking-[0.24em]">
                      Mindset Session
                    </p>
                    <div className="space-y-0.5">
                      <DialogTitle className="text-balance pr-2 font-semibold text-lg tracking-tight sm:text-[1.85rem]">
                        {set.title}
                      </DialogTitle>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Tap the card to flip. Tap a rating to advance.
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-4 md:px-5 md:py-4">
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
                    {studySessionContent}
                  </div>

                  <div className="space-y-1.5 px-0.5 pb-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button
                        className="h-6 rounded-md px-2.5 text-xs"
                        disabled={!activeCard}
                        onClick={() =>
                          flipReviewCard(studyRevealed ? "front" : "back")
                        }
                        type="button"
                        variant="outline"
                      >
                        {studyRevealed ? "Hide answer" : "Reveal answer"}
                      </Button>
                      <span className="hidden text-muted-foreground text-xs sm:inline">
                        Space to flip · 1-4 to grade
                      </span>
                    </div>
                    {studyError ? (
                      <p className="text-rose-600 text-xs dark:text-rose-300">
                        {studyError}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                      <RatingButton
                        disabled={reviewBusy || !studyRevealed || !activeCard}
                        label="1 · Again"
                        onClick={() => submitReview("again")}
                        rating="again"
                      />
                      <RatingButton
                        disabled={reviewBusy || !studyRevealed || !activeCard}
                        label="2 · Hard"
                        onClick={() => submitReview("hard")}
                        rating="hard"
                      />
                      <RatingButton
                        disabled={reviewBusy || !studyRevealed || !activeCard}
                        label="3 · Good"
                        onClick={() => submitReview("good")}
                        rating="good"
                      />
                      <RatingButton
                        disabled={reviewBusy || !studyRevealed || !activeCard}
                        label="4 · Easy"
                        onClick={() => submitReview("easy")}
                        rating="easy"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="mt-4 min-w-0">
            <div className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium text-foreground text-sm">
                    Card bank
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Search, edit, or kill cards.
                  </p>
                </div>
                <Input
                  className="max-w-xs"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search front, back, notes, or tags"
                  value={search}
                />
              </div>
            </div>
            <div className="min-w-0">
              <ScrollArea className="h-[30rem] w-full rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCards.map((card) => {
                      const snapshot = snapshotByCardId.get(card.id) ?? null;

                      return (
                        <TableRow key={card.id}>
                          <TableCell className="align-top">
                            <div className="space-y-2">
                              <p className="line-clamp-2 text-foreground text-sm">
                                {card.frontMarkdown}
                              </p>
                              <p className="line-clamp-2 text-muted-foreground text-xs">
                                {card.backMarkdown}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {snapshot
                              ? stateBadge(snapshot.displayState)
                              : null}
                          </TableCell>
                          <TableCell className="align-top text-muted-foreground text-xs">
                            {snapshot?.dueAt
                              ? new Date(snapshot.dueAt).toLocaleString()
                              : "Not scheduled"}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {card.tags.length > 0 ? (
                                card.tags.map((tag) => (
                                  <Badge
                                    className="rounded-md"
                                    key={tag}
                                    variant="outline"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No tags
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => openEditor(card)}
                                size="icon-sm"
                                type="button"
                                variant="outline"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                onClick={() => archiveCard(card.id)}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function RatingButton({
  disabled,
  label,
  onClick,
  rating,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  rating: Rating;
}) {
  return (
    <Button
      className={cn(
        "h-7 justify-start rounded-md border px-2.5 font-medium text-[0.72rem] tracking-tight transition-colors sm:justify-center",
        RATING_STYLES[rating],
        disabled &&
          "border-border/70 bg-muted/30 text-muted-foreground hover:border-border/70 hover:bg-muted/30"
      )}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  );
}
