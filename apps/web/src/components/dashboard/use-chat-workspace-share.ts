"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { shouldLoadChatShareSuggestions } from "@/components/dashboard/chat-workspace-model";
import {
  createChatShareLink,
  grantChatShareAccess,
  loadChatShareSuggestions,
} from "@/components/dashboard/chat-workspace-share-data";
import type { ShareSuggestion } from "@/types/share";

export function useChatWorkspaceShare({
  currentChatSlug,
  isReadonly,
}: {
  currentChatSlug: string;
  isReadonly: boolean;
}) {
  const [shareEmail, setShareEmail] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const resetShareState = useCallback(() => {
    setShareEmail("");
    setShareLink(null);
    setShareBusy(false);
    setShareStatus(null);
    setIsShareDialogOpen(false);
  }, []);

  const loadShareSuggestionsEnabled = shouldLoadChatShareSuggestions({
    currentChatSlug,
    isShareDialogOpen,
    shareEmail,
  });

  const shareSuggestionsQuery = useQuery({
    enabled: loadShareSuggestionsEnabled,
    queryFn: ({ signal }) =>
      loadChatShareSuggestions({
        chatSlug: currentChatSlug,
        email: shareEmail,
        signal,
      }),
    queryKey: [
      "chat-share-suggestions",
      currentChatSlug,
      shareEmail.trim().toLowerCase(),
    ],
    staleTime: 30_000,
  });

  const shareSuggestions =
    isShareDialogOpen && currentChatSlug !== "new"
      ? (shareSuggestionsQuery.data ?? [])
      : [];

  const handleShareWithEmail = useCallback(async () => {
    const email = shareEmail.trim();
    if (!email) {
      return;
    }

    setShareBusy(true);
    setShareStatus(null);
    try {
      await grantChatShareAccess({
        chatSlug: currentChatSlug,
        email,
      });
      setShareEmail("");
      setShareStatus(`Method access granted to ${email}.`);
    } catch {
      setShareStatus("Could not grant method access.");
    } finally {
      setShareBusy(false);
    }
  }, [currentChatSlug, shareEmail]);

  const handleGenerateShareLink = useCallback(async () => {
    setShareBusy(true);
    setShareStatus(null);
    try {
      const nextShareLink = await createChatShareLink(currentChatSlug);
      if (nextShareLink) {
        setShareLink(nextShareLink);
        setShareStatus("Method share link generated.");
      }
    } catch {
      setShareStatus("Unable to generate method link.");
    } finally {
      setShareBusy(false);
    }
  }, [currentChatSlug]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setShareStatus("Method link copied.");
    } catch {
      setShareStatus("Unable to copy method link.");
    }
  }, [shareLink]);

  const handleShareDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsShareDialogOpen(open);
      if (!open) {
        resetShareState();
      }
    },
    [resetShareState]
  );

  return {
    canShare: !isReadonly && currentChatSlug !== "new",
    handleCopyShareLink,
    handleGenerateShareLink,
    handleShareDialogOpenChange,
    handleShareEmailChange: setShareEmail,
    handleShareWithEmail,
    isShareDialogOpen,
    resetShareState,
    shareBusy,
    shareEmail,
    shareLink,
    shareStatus,
    shareSuggestions: shareSuggestions as ShareSuggestion[],
  };
}
