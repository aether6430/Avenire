"use client";

import type { ChatSummary } from "@avenire/database";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useMemo } from "react";
import type {
  PaletteCommandItem,
  PaletteSearchItem,
} from "@/components/dashboard/command-palette-model";
import {
  commandMatches,
  FILE_FUSE_OPTIONS,
  FILE_RESULTS_LIMIT,
  matchesNeedle,
} from "@/components/dashboard/command-palette-model";
import type {
  WorkspaceSearchItem,
  WorkspaceSearchResult,
} from "@/components/files/search-model";
import {
  mapWorkspaceRetrievalResults,
  queryWorkspaceRetrievalApi,
  resolveWorkspaceRetrievalError,
} from "@/components/files/search-model";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { WorkspaceBrowseItem } from "@/lib/workspace-browse-model";

export interface CommandPaletteSearchState {
  chatResults: PaletteSearchItem[];
  filteredCommands: {
    create: PaletteCommandItem[];
    general: PaletteCommandItem[];
  };
  flashcardResults: PaletteSearchItem[];
  fuzzyResults: WorkspaceBrowseItem[];
  hasCommandMatches: boolean;
  hasWorkspaceSearchContext: boolean;
  isRetrieving: boolean;
  retrievalError: string | null;
  retrievalResults: WorkspaceSearchResult[];
}

export function useCommandPaletteSearch({
  cachedChats,
  cachedFlashcardSets,
  commandItems,
  open,
  resolvedWorkspaceUuid,
  retrievalSearchItems,
  searchItems,
  searchQuery,
}: {
  cachedChats: ChatSummary[];
  cachedFlashcardSets: FlashcardSetSummary[];
  commandItems: PaletteCommandItem[];
  open: boolean;
  resolvedWorkspaceUuid: string | null;
  retrievalSearchItems: WorkspaceSearchItem[];
  searchItems: WorkspaceBrowseItem[];
  searchQuery: string;
}): CommandPaletteSearchState {
  const filteredCommands = useMemo(() => {
    if (!searchQuery) {
      return {
        create: commandItems.filter((item) => item.group === "Create"),
        general: commandItems.filter((item) => item.group === "General"),
      };
    }

    const matches = commandItems.filter((item) =>
      commandMatches(item, searchQuery)
    );
    return {
      create: matches.filter((item) => item.group === "Create"),
      general: matches.filter((item) => item.group === "General"),
    };
  }, [commandItems, searchQuery]);

  const hasCommandMatches =
    filteredCommands.general.length > 0 || filteredCommands.create.length > 0;

  const chatResults = useMemo<PaletteSearchItem[]>(() => {
    if (!searchQuery) {
      return [];
    }

    return cachedChats
      .filter((chat) =>
        matchesNeedle(
          `${chat.title} ${chat.slug} ${chat.workspaceId}`,
          searchQuery
        )
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
      .map((chat) => ({
        description: chat.slug,
        id: chat.id,
        label: chat.title,
        meta: new Date(chat.updatedAt).toLocaleDateString(),
        path: `/workspace/chats/${chat.slug}`,
        type: "chat",
      }));
  }, [cachedChats, searchQuery]);

  const flashcardResults = useMemo<PaletteSearchItem[]>(() => {
    if (!searchQuery) {
      return [];
    }

    return cachedFlashcardSets
      .filter((set) => matchesNeedle(`${set.title} ${set.id}`, searchQuery))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
      .map((set) => ({
        description: `${set.dueCount} due · ${set.newCount} new`,
        id: set.id,
        label: set.title,
        meta: new Date(set.updatedAt).toLocaleDateString(),
        path: `/workspace/flashcards/${set.id}`,
        type: "flashcard",
      }));
  }, [cachedFlashcardSets, searchQuery]);

  const shouldSearchFiles =
    Boolean(searchQuery) &&
    !hasCommandMatches &&
    chatResults.length === 0 &&
    flashcardResults.length === 0 &&
    searchItems.length > 0;

  const fuse = useMemo(
    () => new Fuse(searchItems, FILE_FUSE_OPTIONS),
    [searchItems]
  );

  const fuzzyResults = useMemo(() => {
    if (!shouldSearchFiles) {
      return [];
    }

    return fuse
      .search(searchQuery)
      .filter((result) => (result.score ?? 1) <= FILE_FUSE_OPTIONS.threshold)
      .slice(0, FILE_RESULTS_LIMIT)
      .map((result) => result.item);
  }, [fuse, searchQuery, shouldSearchFiles]);

  const fileSearchFingerprint = useMemo(
    () =>
      retrievalSearchItems
        .map(
          (item) =>
            `${item.workspaceUuid ?? ""}:${item.id}:${item.title}:${item.path}`
        )
        .join("\u0001"),
    [retrievalSearchItems]
  );

  const retrievalQuery = useQuery({
    queryFn: async ({ signal }) =>
      resolvedWorkspaceUuid && searchQuery
        ? mapWorkspaceRetrievalResults({
            items: retrievalSearchItems,
            limit: FILE_RESULTS_LIMIT,
            results: await queryWorkspaceRetrievalApi({
              limit: FILE_RESULTS_LIMIT,
              query: searchQuery,
              signal,
              workspaceUuid: resolvedWorkspaceUuid,
            }),
          })
        : Promise.resolve([]),
    queryKey: [
      "command-palette",
      "retrieval",
      resolvedWorkspaceUuid,
      searchQuery,
      fileSearchFingerprint,
    ],
    enabled: Boolean(
      open &&
        shouldSearchFiles &&
        fuzzyResults.length === 0 &&
        resolvedWorkspaceUuid &&
        retrievalSearchItems.length > 0
    ),
    retry: false,
  });

  const retrievalError =
    fuzzyResults.length > 0 || hasCommandMatches
      ? null
      : retrievalQuery.isError
        ? resolveWorkspaceRetrievalError(retrievalQuery.error)
        : null;

  const retrievalResults =
    fuzzyResults.length > 0 || hasCommandMatches || retrievalError
      ? []
      : (retrievalQuery.data ?? []);

  return {
    chatResults,
    filteredCommands,
    flashcardResults,
    fuzzyResults,
    hasCommandMatches,
    hasWorkspaceSearchContext:
      searchItems.length > 0 || Boolean(resolvedWorkspaceUuid),
    isRetrieving: retrievalQuery.isFetching,
    retrievalError,
    retrievalResults,
  };
}
