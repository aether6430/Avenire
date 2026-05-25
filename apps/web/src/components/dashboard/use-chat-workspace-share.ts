"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  createChatShareLink,
  grantChatShareAccess,
  loadChatShareSuggestions,
} from "@/components/dashboard/chat-workspace-share-data";
import {
  canShareWorkspaceChat,
  createCopiedChatWorkspaceShareLinkState,
  createFailedChatWorkspaceShareCopyState,
  createFailedChatWorkspaceShareGrantState,
  createFailedChatWorkspaceShareLinkState,
  createGeneratedChatWorkspaceShareLinkState,
  createGrantedChatWorkspaceShareState,
  createResetChatWorkspaceShareState,
  DEFAULT_CHAT_WORKSPACE_SHARE_STATE,
  resolveChatWorkspaceShareSuggestions,
  shouldLoadChatWorkspaceShareSuggestions,
} from "@/components/dashboard/chat-workspace-share-runtime-model";

export function useChatWorkspaceShare({
  currentChatSlug,
  isReadonly,
}: {
  currentChatSlug: string;
  isReadonly: boolean;
}) {
  const [shareEmail, setShareEmail] = useState(
    DEFAULT_CHAT_WORKSPACE_SHARE_STATE.shareEmail
  );
  const [shareLink, setShareLink] = useState<string | null>(
    DEFAULT_CHAT_WORKSPACE_SHARE_STATE.shareLink
  );
  const [shareBusy, setShareBusy] = useState(
    DEFAULT_CHAT_WORKSPACE_SHARE_STATE.shareBusy
  );
  const [shareStatus, setShareStatus] = useState<string | null>(
    DEFAULT_CHAT_WORKSPACE_SHARE_STATE.shareStatus
  );
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(
    DEFAULT_CHAT_WORKSPACE_SHARE_STATE.isShareDialogOpen
  );

  const resetShareState = useCallback(() => {
    const next = createResetChatWorkspaceShareState();
    setShareEmail(next.shareEmail);
    setShareLink(next.shareLink);
    setShareBusy(next.shareBusy);
    setShareStatus(next.shareStatus);
    setIsShareDialogOpen(next.isShareDialogOpen);
  }, []);

  const loadShareSuggestionsEnabled = shouldLoadChatWorkspaceShareSuggestions({
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

  const shareSuggestions = resolveChatWorkspaceShareSuggestions({
    currentChatSlug,
    isShareDialogOpen,
    shareEmail,
    suggestions: shareSuggestionsQuery.data,
  });

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
      const next = createGrantedChatWorkspaceShareState(email);
      setShareEmail(next.shareEmail);
      setShareStatus(next.shareStatus);
    } catch {
      setShareStatus(createFailedChatWorkspaceShareGrantState().shareStatus);
    } finally {
      setShareBusy(false);
    }
  }, [currentChatSlug, shareEmail]);

  const handleGenerateShareLink = useCallback(async () => {
    setShareBusy(true);
    setShareStatus(null);
    try {
      const nextShareLink = await createChatShareLink(currentChatSlug);
      const next = createGeneratedChatWorkspaceShareLinkState({
        currentShareLink: shareLink,
        nextShareLink,
      });
      setShareLink(next.shareLink);
      setShareStatus(next.shareStatus);
    } catch {
      setShareStatus(createFailedChatWorkspaceShareLinkState().shareStatus);
    } finally {
      setShareBusy(false);
    }
  }, [currentChatSlug, shareLink]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setShareStatus(createCopiedChatWorkspaceShareLinkState().shareStatus);
    } catch {
      setShareStatus(createFailedChatWorkspaceShareCopyState().shareStatus);
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
    canShare: canShareWorkspaceChat({
      currentChatSlug,
      isReadonly,
    }),
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
    shareSuggestions,
  };
}
