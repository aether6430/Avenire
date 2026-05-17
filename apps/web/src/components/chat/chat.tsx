"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { ChatSurface } from "@/components/chat/chat-surface";
import { useChatRuntime } from "@/components/chat/use-chat-runtime";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string | null;
  isReadonly: boolean;
  selectedModel: string;
  title: string;
  userName?: string;
  workspaceUuid: string;
}

export function Chat({
  id,
  initialMessages,
  initialPrompt,
  isReadonly,
  selectedModel,
  title,
  userName,
  workspaceUuid,
}: ChatProps) {
  const runtime = useChatRuntime({
    id,
    initialMessages,
    initialPrompt,
    selectedModel,
    workspaceUuid,
  });

  return (
    <ChatSurface
      {...runtime}
      isReadonly={isReadonly}
      title={title}
      userName={userName}
    />
  );
}
