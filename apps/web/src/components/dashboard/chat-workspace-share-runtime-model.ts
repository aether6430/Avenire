import { shouldLoadChatShareSuggestions } from "@/components/dashboard/chat-workspace-model";
import type { ShareSuggestion } from "@/types/share";

export interface ChatWorkspaceShareState {
  isShareDialogOpen: boolean;
  shareBusy: boolean;
  shareEmail: string;
  shareLink: string | null;
  shareStatus: string | null;
}

export const DEFAULT_CHAT_WORKSPACE_SHARE_STATE: ChatWorkspaceShareState = {
  isShareDialogOpen: false,
  shareBusy: false,
  shareEmail: "",
  shareLink: null,
  shareStatus: null,
};

export function canShareWorkspaceChat(input: {
  currentChatSlug: string;
  isReadonly: boolean;
}) {
  return !input.isReadonly && input.currentChatSlug !== "new";
}

export function resolveChatWorkspaceShareSuggestions(input: {
  currentChatSlug: string;
  isShareDialogOpen: boolean;
  shareEmail: string;
  suggestions: ShareSuggestion[] | undefined;
}) {
  return shouldLoadChatWorkspaceShareSuggestions({
    currentChatSlug: input.currentChatSlug,
    isShareDialogOpen: input.isShareDialogOpen,
    shareEmail: input.shareEmail,
  })
    ? (input.suggestions ?? [])
    : [];
}

export function shouldLoadChatWorkspaceShareSuggestions(input: {
  currentChatSlug: string;
  isShareDialogOpen: boolean;
  shareEmail: string;
}) {
  return shouldLoadChatShareSuggestions(input);
}

export function createResetChatWorkspaceShareState(): ChatWorkspaceShareState {
  return {
    ...DEFAULT_CHAT_WORKSPACE_SHARE_STATE,
  };
}

export function createGrantedChatWorkspaceShareState(
  email: string
): Pick<ChatWorkspaceShareState, "shareBusy" | "shareEmail" | "shareStatus"> {
  return {
    shareBusy: false,
    shareEmail: "",
    shareStatus: `Method access granted to ${email}.`,
  };
}

export function createFailedChatWorkspaceShareGrantState(): Pick<
  ChatWorkspaceShareState,
  "shareBusy" | "shareStatus"
> {
  return {
    shareBusy: false,
    shareStatus: "Could not grant method access.",
  };
}

export function createGeneratedChatWorkspaceShareLinkState(input: {
  currentShareLink: string | null;
  nextShareLink: string | null;
}): Pick<ChatWorkspaceShareState, "shareBusy" | "shareLink" | "shareStatus"> {
  return input.nextShareLink
    ? {
        shareBusy: false,
        shareLink: input.nextShareLink,
        shareStatus: "Method share link generated.",
      }
    : {
        shareBusy: false,
        shareLink: input.currentShareLink,
        shareStatus: null,
      };
}

export function createFailedChatWorkspaceShareLinkState(): Pick<
  ChatWorkspaceShareState,
  "shareBusy" | "shareStatus"
> {
  return {
    shareBusy: false,
    shareStatus: "Unable to generate method link.",
  };
}

export function createCopiedChatWorkspaceShareLinkState(): Pick<
  ChatWorkspaceShareState,
  "shareStatus"
> {
  return {
    shareStatus: "Method link copied.",
  };
}

export function createFailedChatWorkspaceShareCopyState(): Pick<
  ChatWorkspaceShareState,
  "shareStatus"
> {
  return {
    shareStatus: "Unable to copy method link.",
  };
}
