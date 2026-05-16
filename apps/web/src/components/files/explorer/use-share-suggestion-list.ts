"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShareSuggestion } from "@/components/files/explorer/shared";

interface UseShareSuggestionListOptions {
  enabled: boolean;
  loadShareSuggestions: (
    q: string,
    cb: (suggestions: ShareSuggestion[]) => void
  ) => void;
  query: string;
  workspaceUuid: string;
}

export function useShareSuggestionList({
  enabled,
  loadShareSuggestions,
  query,
  workspaceUuid,
}: UseShareSuggestionListOptions) {
  const [suggestions, setSuggestions] = useState<ShareSuggestion[]>([]);

  useEffect(() => {
    if (!(enabled && workspaceUuid)) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadShareSuggestions(query, setSuggestions);
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, loadShareSuggestions, query, workspaceUuid]);

  const requestSuggestions = useCallback(() => {
    if (!(enabled && workspaceUuid)) {
      return;
    }

    void loadShareSuggestions(query, setSuggestions);
  }, [enabled, loadShareSuggestions, query, workspaceUuid]);

  return {
    requestSuggestions,
    suggestions,
  };
}
