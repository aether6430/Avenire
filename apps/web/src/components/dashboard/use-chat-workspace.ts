"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { useEffect, useMemo, useState } from "react";
import {
  buildChatWorkspaceRoute,
  type ChatWorkspaceMetaOverride,
  type ChatWorkspaceProps,
  resolveChatWorkspaceInitialMessages,
  resolveChatWorkspaceMeta,
} from "@/components/dashboard/chat-workspace-model";
import { useChatWorkspaceLifecycle } from "@/components/dashboard/use-chat-workspace-lifecycle";
import { useChatWorkspaceShare } from "@/components/dashboard/use-chat-workspace-share";
import { usePanePathname } from "@/lib/workspace-panes";
import { chatMessageHandoffActions } from "@/stores/chat-message-handoff-store";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";
import type { ShareSuggestion } from "@/types/share";

export interface ChatWorkspaceRuntime {
  canShare: boolean;
  currentChatSlug: string;
  handleCopyShareLink: () => Promise<void>;
  handleGenerateShareLink: () => Promise<void>;
  handleShareDialogOpenChange: (open: boolean) => void;
  handleShareEmailChange: (value: string) => void;
  handleShareWithEmail: () => Promise<void>;
  icon: string | null;
  initialPrompt?: string | null;
  isPending: boolean;
  isReadonly: boolean;
  isShareDialogOpen: boolean;
  resolvedInitialMessages: UIMessage[];
  shareBusy: boolean;
  shareEmail: string;
  shareLink: string | null;
  shareStatus: string | null;
  shareSuggestions: ShareSuggestion[];
  title: string;
  userName?: string;
  workspaceUuid: string;
}

export function useChatWorkspace({
  chatSlug,
  chatTitle,
  chatIcon,
  initialMessages,
  initialPrompt,
  isReadonly = false,
  workspaceUuid,
  userName,
}: ChatWorkspaceProps): ChatWorkspaceRuntime {
  const pathname = usePanePathname();
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const [activeChatSlug, setActiveChatSlug] = useState(chatSlug);
  const [chatMetaOverride, setChatMetaOverride] =
    useState<ChatWorkspaceMetaOverride | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [resolvedInitialMessages, setResolvedInitialMessages] = useState<
    UIMessage[]
  >(() =>
    resolveChatWorkspaceInitialMessages({
      initialMessages,
      pendingMessages:
        initialMessages.length > 0
          ? null
          : chatMessageHandoffActions.consume(chatSlug),
    })
  );
  const currentChatSlug = activeChatSlug;
  const shareRuntime = useChatWorkspaceShare({
    currentChatSlug,
    isReadonly,
  });
  useChatWorkspaceLifecycle({
    chatIcon,
    chatSlug,
    currentChatSlug,
    initialMessages,
    resetShareState: shareRuntime.resetShareState,
    setActiveChatSlug,
    setChatMetaOverride,
    setIsPending,
    setResolvedInitialMessages,
  });

  const { icon, title } = useMemo(
    () =>
      resolveChatWorkspaceMeta({
        chatIcon,
        chatMetaOverride,
        chatTitle,
        currentChatSlug,
      }),
    [chatIcon, chatMetaOverride, chatTitle, currentChatSlug]
  );
  const currentRoute = useMemo(
    () =>
      buildChatWorkspaceRoute({
        currentChatSlug,
        pathname,
      }),
    [currentChatSlug, pathname]
  );
  useEffect(() => {
    recordRoute(currentRoute);
  }, [currentRoute, recordRoute]);

  return {
    canShare: shareRuntime.canShare,
    currentChatSlug,
    handleCopyShareLink: shareRuntime.handleCopyShareLink,
    handleGenerateShareLink: shareRuntime.handleGenerateShareLink,
    handleShareDialogOpenChange: shareRuntime.handleShareDialogOpenChange,
    handleShareEmailChange: shareRuntime.handleShareEmailChange,
    handleShareWithEmail: shareRuntime.handleShareWithEmail,
    icon,
    initialPrompt,
    isPending,
    isReadonly,
    isShareDialogOpen: shareRuntime.isShareDialogOpen,
    resolvedInitialMessages,
    shareBusy: shareRuntime.shareBusy,
    shareEmail: shareRuntime.shareEmail,
    shareLink: shareRuntime.shareLink,
    shareStatus: shareRuntime.shareStatus,
    shareSuggestions: shareRuntime.shareSuggestions,
    title,
    userName,
    workspaceUuid,
  };
}
