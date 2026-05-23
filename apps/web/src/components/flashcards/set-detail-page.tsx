"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HeaderBreadcrumbs,
  HeaderTitle,
} from "@/components/dashboard/header-portal";
import { FlashcardSetDetailSurface } from "@/components/flashcards/flashcard-set-detail-surface";
import { useFlashcardSetDetail } from "@/components/flashcards/use-flashcard-set-detail";
import {
  readCachedFlashcardSet,
  removeCachedFlashcardSet,
  writeCachedFlashcardSet,
} from "@/lib/flashcard-browser-cache";
import { normalizeFlashcardSetId } from "@/lib/flashcard-set-id";
import type { FlashcardSetRecord, FlashcardTaxonomy } from "@/lib/flashcards";

function ReadyFlashcardSetDetail({
  initialDrillFilters,
  initialSet,
  initialStudyOpen = false,
}: {
  initialDrillFilters: FlashcardTaxonomy[];
  initialSet: FlashcardSetRecord;
  initialStudyOpen?: boolean;
}) {
  const runtime = useFlashcardSetDetail({
    initialDrillFilters,
    initialSet,
    initialStudyOpen,
  });

  return <FlashcardSetDetailSurface runtime={runtime} />;
}

function hasMatchingVersion(
  current: FlashcardSetRecord | null,
  next: FlashcardSetRecord
) {
  return current?.id === next.id && current.updatedAt === next.updatedAt;
}

function readMindsetError(status: number) {
  return status === 404
    ? "Mindset Set not found."
    : "Unable to load Mindset Set.";
}

function parseDrillFilters(rawDrill: string | string[] | undefined) {
  const values: string[] = [];

  if (Array.isArray(rawDrill)) {
    values.push(...rawDrill);
  } else if (rawDrill) {
    values.push(rawDrill);
  }

  return values.flatMap((value) => {
    try {
      const parsed = JSON.parse(value) as Partial<FlashcardTaxonomy>;
      if (
        typeof parsed.subject !== "string" ||
        typeof parsed.topic !== "string" ||
        typeof parsed.concept !== "string"
      ) {
        return [];
      }

      return [
        {
          concept: parsed.concept,
          subject: parsed.subject,
          topic: parsed.topic,
        },
      ];
    } catch {
      return [];
    }
  });
}

function DetailPageBreadcrumbs({ title }: { title: string }) {
  return (
    <HeaderBreadcrumbs>
      <div className="min-w-0">
        <p className="truncate text-muted-foreground text-sm">Mindset Set</p>
        <p className="truncate text-muted-foreground text-xs">{title}</p>
      </div>
    </HeaderBreadcrumbs>
  );
}

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
          Loading Mindset Set
        </p>
        <h1 className="mt-2 font-semibold text-2xl tracking-tight">
          Opening Mindset Set
        </h1>
        <div className="mt-6 space-y-3">
          <div className="h-5 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlashcardSetPageClient({
  autoStudy,
  drillFilters: rawDrillFilters,
  setId,
}: {
  autoStudy: boolean;
  drillFilters: string | string[] | undefined;
  setId: string;
}) {
  const initialDrillFilters = useMemo(
    () => parseDrillFilters(rawDrillFilters),
    [rawDrillFilters]
  );
  const normalizedSetId = useMemo(
    () => normalizeFlashcardSetId(setId),
    [setId]
  );
  const cachedSet = useMemo(
    () => (normalizedSetId ? readCachedFlashcardSet(normalizedSetId) : null),
    [normalizedSetId]
  );
  const [set, setSet] = useState<FlashcardSetRecord | null>(cachedSet);
  const [loading, setLoading] = useState(
    () => cachedSet === null && normalizedSetId !== null
  );
  const [error, setError] = useState<string | null>(() =>
    normalizedSetId ? null : "Mindset Set not found."
  );
  const loadedSetIdRef = useRef(cachedSet?.id ?? null);

  const applySet = useCallback((nextSet: FlashcardSetRecord) => {
    loadedSetIdRef.current = nextSet.id;
    writeCachedFlashcardSet(nextSet);
    startTransition(() => {
      setSet((current) =>
        hasMatchingVersion(current, nextSet) ? current : nextSet
      );
      setLoading(false);
      setError(null);
    });
  }, []);

  const loadSet = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      if (!normalizedSetId) {
        startTransition(() => {
          setError("Mindset Set not found.");
          setLoading(false);
        });
        return;
      }

      const cached = readCachedFlashcardSet(normalizedSetId);

      startTransition(() => {
        if (cached) {
          setSet((current) =>
            hasMatchingVersion(current, cached) ? current : cached
          );
        }
        setLoading(cached === null && !loadedSetIdRef.current);
        setError(null);
      });

      if (cached && !force) {
        loadedSetIdRef.current = cached.id;
        return;
      }

      try {
        const response = await fetch(
          `/api/flashcards/sets/${normalizedSetId}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            removeCachedFlashcardSet(normalizedSetId);
          }

          setError(readMindsetError(response.status));
          setLoading(false);
          return;
        }

        const payload = (await response.json()) as {
          set?: FlashcardSetRecord;
        };

        if (!payload.set) {
          return;
        }

        applySet(payload.set);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load Mindset Set."
        );
        setLoading(false);
      }
    },
    [applySet, normalizedSetId]
  );

  useEffect(() => {
    loadSet().catch(() => undefined);

    const onInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
        }>
      ).detail;

      if (detail?.kind !== "flashcards") {
        return;
      }

      loadSet({ force: true }).catch(() => undefined);
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      onInvalidated
    );

    return () => {
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        onInvalidated
      );
    };
  }, [loadSet]);

  if (loading && !set) {
    return (
      <>
        <HeaderTitle>Mindset Set</HeaderTitle>
        <DetailPageBreadcrumbs title="Opening Mindset Set" />
        <LoadingShell />
      </>
    );
  }

  if (error && !set) {
    return (
      <>
        <HeaderTitle>{error}</HeaderTitle>
        <DetailPageBreadcrumbs title={error} />
        <div className="flex h-full items-center justify-center bg-background px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm">
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
              Mindset Set
            </p>
            <h1 className="mt-2 font-semibold text-2xl tracking-tight">
              {error}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Try going back to the Mindset Sets list and opening it again.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!set) {
    return (
      <>
        <HeaderTitle>Mindset Set</HeaderTitle>
        <DetailPageBreadcrumbs title="Opening Mindset Set" />
        <LoadingShell />
      </>
    );
  }

  return (
    <ReadyFlashcardSetDetail
      initialDrillFilters={initialDrillFilters}
      initialSet={set}
      initialStudyOpen={autoStudy}
    />
  );
}
