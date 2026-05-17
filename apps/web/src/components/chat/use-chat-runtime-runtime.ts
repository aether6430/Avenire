import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import type { FileUIPart } from "ai";
import type { Attachment } from "@/components/chat/attachment";
import type {
  SendMessageInput,
  SendMessageOptions,
} from "@/components/chat/chat-model";
import type {
  ChatRuntimeStatus,
  getChatStatusPetNotification,
} from "@/components/chat/use-chat-runtime-model";
import type {
  ChatCreatedDetail,
  ChatNameUpdatedDetail,
  ChatStreamStatusDetail,
} from "@/lib/chat-events";
import type { PetNotificationDetail } from "@/lib/pet-preferences";

export function handleChatRuntimeDataPart(input: {
  dataPart: { data: unknown; type: string };
  onAgentActivity: (activity: AgentActivityData | null) => void;
  onChatCreated: (detail: ChatCreatedDetail) => void;
  onChatName: (detail: ChatNameUpdatedDetail) => void;
}) {
  const { dataPart } = input;

  if (dataPart.type === "data-chatCreated") {
    const detail = dataPart.data as Partial<ChatCreatedDetail>;
    if (!(detail?.id && detail?.fromId)) {
      return;
    }
    input.onChatCreated(detail as ChatCreatedDetail);
    return;
  }

  if (dataPart.type === "data-chatName") {
    const detail = dataPart.data as Partial<ChatNameUpdatedDetail>;
    if (!(detail?.id && detail?.name)) {
      return;
    }
    input.onChatName(detail as ChatNameUpdatedDetail);
    return;
  }

  if (dataPart.type === "data-agent_activity") {
    input.onAgentActivity(dataPart.data as AgentActivityData);
  }
}

export async function sendChatRuntimeMessage(input: {
  append: (
    message: SendMessageInput,
    options?: SendMessageOptions
  ) => Promise<void>;
  chatId: string;
  createOptimisticUserMessage: (message: SendMessageInput) => UIMessage | null;
  currentMessages: UIMessage[];
  message: SendMessageInput;
  options?: SendMessageOptions;
  pendingChatRouteId: string | null;
  setPendingNewChatMessages: (messages: UIMessage[] | null) => void;
}) {
  if (input.chatId === "new") {
    const optimisticMessage = input.createOptimisticUserMessage(input.message);
    if (optimisticMessage) {
      input.setPendingNewChatMessages([
        ...input.currentMessages,
        optimisticMessage,
      ]);
    }
  }

  try {
    return await input.append(input.message, input.options);
  } catch (error) {
    if (input.chatId === "new" && !input.pendingChatRouteId) {
      input.setPendingNewChatMessages(null);
    }
    throw error;
  }
}

export async function regenerateChatRuntimeMessage(input: {
  assistantMessageId: string;
  buildRegenerationRequest: (
    messages: UIMessage[],
    assistantMessageId: string
  ) => { message: SendMessageInput; preservedMessages: UIMessage[] } | null;
  handleError: (error: Error) => void;
  messages: UIMessage[];
  sendMessage: (
    message: SendMessageInput,
    options?: SendMessageOptions
  ) => Promise<void>;
  setMessages: (messages: UIMessage[]) => void;
  status: ChatRuntimeStatus;
}) {
  if (input.status === "submitted" || input.status === "streaming") {
    return;
  }

  const regeneration = input.buildRegenerationRequest(
    input.messages,
    input.assistantMessageId
  );
  if (!regeneration) {
    return;
  }

  const { preservedMessages, message } = regeneration;
  input.setMessages(preservedMessages);

  try {
    await input.sendMessage(message);
  } catch (error) {
    input.setMessages(input.messages);
    input.handleError(
      error instanceof Error ? error : new Error("Failed to regenerate")
    );
  }
}

export function buildChatRuntimeSubmission(input: {
  buildChatSubmissionFileParts: (files: Attachment[]) => FileUIPart[];
  files: Attachment[];
  inputValue: string;
}) {
  const fileParts = input.buildChatSubmissionFileParts(input.files);

  if (fileParts.length > 0) {
    return {
      files: fileParts,
      text: input.inputValue,
    } satisfies SendMessageInput;
  }

  return { text: input.inputValue } satisfies SendMessageInput;
}

export function flushPendingChatRuntimeRoute(input: {
  pendingChatRouteId: string | null;
  clearPendingChatRoute: () => void;
  clearPendingNewChatMessages: () => void;
  primeNewChatHandoff: (chatId: string) => void;
  replaceRoute: (href: string) => void;
}) {
  if (!input.pendingChatRouteId) {
    return false;
  }

  input.primeNewChatHandoff(input.pendingChatRouteId);
  input.replaceRoute(`/workspace/chats/${input.pendingChatRouteId}`);
  input.clearPendingChatRoute();
  input.clearPendingNewChatMessages();
  return true;
}

export function primeChatRuntimeHandoff(input: {
  chatId: string | null;
  currentMessages: UIMessage[];
  getChatHandoffMessages: (input: {
    currentMessages: UIMessage[];
    pendingMessages: UIMessage[] | null;
  }) => UIMessage[] | null;
  pendingMessages: UIMessage[] | null;
  primeMessages: (chatId: string, messages: UIMessage[]) => void;
}) {
  if (!input.chatId) {
    return false;
  }

  const handoffMessages = input.getChatHandoffMessages({
    currentMessages: input.currentMessages,
    pendingMessages: input.pendingMessages,
  });

  if (!(handoffMessages && handoffMessages.length > 0)) {
    return false;
  }

  input.primeMessages(input.chatId, handoffMessages);
  return true;
}

export function resolveChatRuntimeHydration(input: {
  initialMessages: UIMessage[];
  messageCount: number;
  shouldHydrateInitialChatMessages: (input: {
    initialMessageCount: number;
    messageCount: number;
  }) => boolean;
}) {
  return input.shouldHydrateInitialChatMessages({
    initialMessageCount: input.initialMessages.length,
    messageCount: input.messageCount,
  })
    ? input.initialMessages
    : null;
}

export function publishChatRuntimeStatus(input: {
  chatId: string;
  emitPetNotification: (notification: PetNotificationDetail) => void;
  getChatStatusPetNotification: typeof getChatStatusPetNotification;
  onFinished: (detail: { chatId: string }) => void;
  onStatus: (detail: ChatStreamStatusDetail) => void;
  status: ChatRuntimeStatus;
}) {
  input.onStatus({
    chatId: input.chatId,
    status: input.status,
  });

  const notification = input.getChatStatusPetNotification(input.status);
  if (notification) {
    input.emitPetNotification(notification);
  }

  if (input.status === "ready") {
    input.onFinished({ chatId: input.chatId });
  }
}

export async function flushChatRuntimeAutoPrompt(input: {
  chatId: string;
  getAutoPromptToSend: (input: {
    chatId: string;
    initialPrompt?: string | null;
    lastAutoPrompt: string | null;
    messageCount: number;
    status: ChatRuntimeStatus;
  }) => string | null;
  initialPrompt?: string | null;
  lastAutoPrompt: string | null;
  messageCount: number;
  sendMessage: (
    message: SendMessageInput,
    options?: SendMessageOptions
  ) => Promise<void>;
  setLastAutoPrompt: (prompt: string | null) => void;
  status: ChatRuntimeStatus;
}) {
  const prompt = input.getAutoPromptToSend({
    chatId: input.chatId,
    initialPrompt: input.initialPrompt,
    lastAutoPrompt: input.lastAutoPrompt,
    messageCount: input.messageCount,
    status: input.status,
  });

  if (input.chatId !== "new") {
    input.setLastAutoPrompt(null);
    return false;
  }

  if (!prompt) {
    return false;
  }

  input.setLastAutoPrompt(prompt);
  try {
    await input.sendMessage({ text: prompt });
    return true;
  } catch {
    input.setLastAutoPrompt(null);
    return false;
  }
}

export function publishCompletedChatRuntimeReply(input: {
  getCompletedAssistantMessageId: (input: {
    lastCompletedMessageId: string | null;
    messages: UIMessage[];
    previousStatus: string | null;
    status: ChatRuntimeStatus;
  }) => string | null;
  lastCompletedMessageId: string | null;
  messages: UIMessage[];
  onCompleted: (messageId: string) => void;
  previousStatus: string | null;
  status: ChatRuntimeStatus;
}) {
  const completedMessageId = input.getCompletedAssistantMessageId({
    lastCompletedMessageId: input.lastCompletedMessageId,
    messages: input.messages,
    previousStatus: input.previousStatus,
    status: input.status,
  });

  if (!completedMessageId) {
    return input.lastCompletedMessageId;
  }

  input.onCompleted(completedMessageId);
  return completedMessageId;
}

export function shouldClearChatRuntimeAgentActivity(status: ChatRuntimeStatus) {
  return status === "submitted";
}

export function resolveChatRuntimeFollowBehavior(input: {
  displayedMessageCount: number;
  status: ChatRuntimeStatus;
}) {
  if (input.displayedMessageCount === 0) {
    return null;
  }

  return input.status === "submitted" ? "smooth" : "auto";
}

export function appendDroppedChatAttachments(input: {
  createLocalAttachment: (file: File) => Attachment;
  currentAttachments: Attachment[];
  files: File[];
  getChatAttachmentLimitDescription: () => string;
  willExceedChatAttachmentLimit: (input: {
    currentCount: number;
    incomingCount: number;
  }) => boolean;
}) {
  if (input.files.length === 0) {
    return {
      attachments: input.currentAttachments,
      errorDescription: null,
    };
  }

  if (
    input.willExceedChatAttachmentLimit({
      currentCount: input.currentAttachments.length,
      incomingCount: input.files.length,
    })
  ) {
    return {
      attachments: input.currentAttachments,
      errorDescription: input.getChatAttachmentLimitDescription(),
    };
  }

  return {
    attachments: [
      ...input.currentAttachments,
      ...input.files.map(input.createLocalAttachment),
    ],
    errorDescription: null,
  };
}
