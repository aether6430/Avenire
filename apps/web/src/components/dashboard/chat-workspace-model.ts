import type { UIMessage } from "@avenire/ai/message-types";

export interface ChatWorkspaceProps {
  chatIcon?: string | null;
  chatSlug: string;
  chatTitle: string;
  initialMessages: UIMessage[];
  initialPrompt?: string | null;
  isReadonly?: boolean;
  userName?: string;
  workspaceUuid: string;
}

export interface ChatWorkspaceMetaOverride {
  icon: string | null;
  slug: string;
  title: string;
}

export function resolveChatWorkspaceInitialMessages({
  initialMessages,
  pendingMessages,
}: {
  initialMessages: UIMessage[];
  pendingMessages: UIMessage[] | null | undefined;
}) {
  if (initialMessages.length > 0) {
    return initialMessages;
  }

  return pendingMessages ?? initialMessages;
}

export function resolveChatWorkspaceMeta({
  chatIcon,
  chatMetaOverride,
  chatTitle,
  currentChatSlug,
}: {
  chatIcon?: string | null;
  chatMetaOverride: ChatWorkspaceMetaOverride | null;
  chatTitle: string;
  currentChatSlug: string;
}) {
  return {
    icon:
      chatMetaOverride?.slug === currentChatSlug
        ? chatMetaOverride.icon
        : (chatIcon ?? null),
    title:
      chatMetaOverride?.slug === currentChatSlug
        ? chatMetaOverride.title
        : chatTitle,
  };
}

export function buildChatWorkspaceRoute({
  currentChatSlug,
  pathname,
}: {
  currentChatSlug: string;
  pathname: string;
}) {
  if (pathname === "/workspace/chats/new" && currentChatSlug !== "new") {
    return `/workspace/chats/${currentChatSlug}`;
  }

  return pathname;
}

export function shouldLoadChatShareSuggestions({
  currentChatSlug,
  isShareDialogOpen,
  shareEmail,
}: {
  currentChatSlug: string;
  isShareDialogOpen: boolean;
  shareEmail: string;
}) {
  return (
    isShareDialogOpen &&
    currentChatSlug !== "new" &&
    shareEmail.trim().length > 0
  );
}
