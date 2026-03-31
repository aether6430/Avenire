"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { FlashcardSetDetail } from "@/components/flashcards/set-detail";
import {
  readCachedFlashcardSet,
  removeCachedFlashcardSet,
  writeCachedFlashcardSet,
} from "@/lib/flashcard-browser-cache";
import type { FlashcardSetRecord, FlashcardTaxonomy } from "@/lib/flashcards";

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

function LoadingShell({ setId }: { setId: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
          Loading mindset
        </p>
        <h1 className="mt-2 font-semibold text-2xl tracking-tight">
          Opening deck {setId}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          The deck data is loading on the client so cached decks can open
          instantly.
        </p>
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
  const cachedSet = useMemo(() => readCachedFlashcardSet(setId), [setId]);
  const [set, setSet] = useState<FlashcardSetRecord | null>(cachedSet);
  const [loading, setLoading] = useState(() => cachedSet === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This loader intentionally handles cache hydration, revalidation, and invalidation in one place.
    const loadSet = async () => {
      const cached = readCachedFlashcardSet(setId);
      startTransition(() => {
        setSet(cached);
        setLoading(cached === null);
        setError(null);
      });

      try {
        const response = await fetch(`/api/flashcards/sets/${setId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (!cancelled) {
            if (response.status === 404) {
              removeCachedFlashcardSet(setId);
            }
            setError(
              response.status === 404
                ? "Deck not found."
                : "Unable to load deck."
            );
            setLoading(false);
          }
          return;
        }

        const payload = (await response.json()) as {
          set?: FlashcardSetRecord;
        };

        if (!payload.set || cancelled) {
          return;
        }

        const nextSet = payload.set;
        writeCachedFlashcardSet(nextSet);
        startTransition(() => {
          setSet(nextSet);
          setLoading(false);
          setError(null);
        });
      } catch (fetchError) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load deck."
        );
        setLoading(false);
      }
    };

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

      loadSet().catch(() => undefined);
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      onInvalidated
    );

    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        onInvalidated
      );
    };
  }, [setId]);

  if (loading && !set) {
    return <LoadingShell setId={setId} />;
  }

  if (error && !set) {
    return (
      <div className="flex h-full items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
            Mindset
          </p>
          <h1 className="mt-2 font-semibold text-2xl tracking-tight">
            {error}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Try going back to the deck list and opening the deck again.
          </p>
        </div>
      </div>
    );
  }

  if (!set) {
    return <LoadingShell setId={setId} />;
  }

  return (
    <FlashcardSetDetail
      initialDrillFilters={initialDrillFilters}
      initialSet={set}
      initialStudyOpen={autoStudy}
    />
  );
}
