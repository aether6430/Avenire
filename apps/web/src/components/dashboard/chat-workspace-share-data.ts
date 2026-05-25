import type { ShareSuggestion } from "@/types/share";

export async function loadChatShareSuggestions(input: {
  chatSlug: string;
  email: string;
  signal: AbortSignal;
}): Promise<ShareSuggestion[]> {
  const trimmedEmail = input.email.trim();
  const url = trimmedEmail
    ? `/api/chats/${input.chatSlug}/share/suggestions?q=${encodeURIComponent(trimmedEmail)}`
    : `/api/chats/${input.chatSlug}/share/suggestions`;

  const response = await fetch(url, {
    cache: "no-store",
    signal: input.signal,
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    suggestions?: ShareSuggestion[];
  };
  return payload.suggestions ?? [];
}

export async function grantChatShareAccess(input: {
  chatSlug: string;
  email: string;
}) {
  const response = await fetch(`/api/chats/${input.chatSlug}/share/grants`, {
    body: JSON.stringify({ email: input.email }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Could not grant method access.");
  }
}

export async function createChatShareLink(chatSlug: string) {
  const response = await fetch(`/api/chats/${chatSlug}/share/link`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to generate method link.");
  }

  const payload = (await response.json()) as { shareUrl?: string };
  return payload.shareUrl ?? null;
}
