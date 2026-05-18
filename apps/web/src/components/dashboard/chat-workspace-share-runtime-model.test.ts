import { describe, expect, it } from "vitest";
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
import type { ShareSuggestion } from "@/types/share";

describe("chat workspace share runtime model", () => {
  it("keeps can-share and visible-suggestions gating aligned with the share surface", () => {
    const suggestions: ShareSuggestion[] = [
      {
        email: "ada@example.com",
        name: "Ada",
      },
    ];

    expect(
      canShareWorkspaceChat({
        currentChatSlug: "chat-1",
        isReadonly: false,
      })
    ).toBe(true);
    expect(
      canShareWorkspaceChat({
        currentChatSlug: "new",
        isReadonly: false,
      })
    ).toBe(false);
    expect(
      canShareWorkspaceChat({
        currentChatSlug: "chat-1",
        isReadonly: true,
      })
    ).toBe(false);

    expect(
      resolveChatWorkspaceShareSuggestions({
        currentChatSlug: "chat-1",
        isShareDialogOpen: true,
        shareEmail: "  ada@example.com  ",
        suggestions,
      })
    ).toEqual(suggestions);
    expect(
      shouldLoadChatWorkspaceShareSuggestions({
        currentChatSlug: "chat-1",
        isShareDialogOpen: true,
        shareEmail: "  ada@example.com  ",
      })
    ).toBe(true);
    expect(
      resolveChatWorkspaceShareSuggestions({
        currentChatSlug: "new",
        isShareDialogOpen: true,
        shareEmail: "ada@example.com",
        suggestions,
      })
    ).toEqual([]);
  });

  it("creates a fresh reset state for the share dialog", () => {
    const next = createResetChatWorkspaceShareState();

    expect(next).toEqual(DEFAULT_CHAT_WORKSPACE_SHARE_STATE);
    expect(next).not.toBe(DEFAULT_CHAT_WORKSPACE_SHARE_STATE);
  });

  it("creates granted and failed share-email transitions", () => {
    expect(createGrantedChatWorkspaceShareState("ada@example.com")).toEqual({
      shareBusy: false,
      shareEmail: "",
      shareStatus: "Method access granted to ada@example.com.",
    });
    expect(createFailedChatWorkspaceShareGrantState()).toEqual({
      shareBusy: false,
      shareStatus: "Could not grant method access.",
    });
  });

  it("creates generated and failed share-link transitions", () => {
    expect(
      createGeneratedChatWorkspaceShareLinkState({
        currentShareLink: null,
        nextShareLink: "https://avenire.space/share/chat-1",
      })
    ).toEqual({
      shareBusy: false,
      shareLink: "https://avenire.space/share/chat-1",
      shareStatus: "Method share link generated.",
    });
    expect(
      createGeneratedChatWorkspaceShareLinkState({
        currentShareLink: "https://avenire.space/share/old",
        nextShareLink: null,
      })
    ).toEqual({
      shareBusy: false,
      shareLink: "https://avenire.space/share/old",
      shareStatus: null,
    });
    expect(createFailedChatWorkspaceShareLinkState()).toEqual({
      shareBusy: false,
      shareStatus: "Unable to generate method link.",
    });
  });

  it("creates copied and failed copy-link transitions", () => {
    expect(createCopiedChatWorkspaceShareLinkState()).toEqual({
      shareStatus: "Method link copied.",
    });
    expect(createFailedChatWorkspaceShareCopyState()).toEqual({
      shareStatus: "Unable to copy method link.",
    });
  });
});
