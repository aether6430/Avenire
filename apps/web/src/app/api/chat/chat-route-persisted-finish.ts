import type { ApolloModelName } from "@avenire/ai";
import type { UIMessage } from "@avenire/ai/message-types";
import { getLatestSessionSummaryForChat } from "@avenire/database";
import { consumeChatUnits } from "@/lib/billing-metering";
import {
  type createChatForUser,
  type getChatBySlugForUser,
  saveMessagesForChatSlug,
} from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import type { createApiLogger } from "@/lib/observability";
import { persistSessionSummaryForCompletedTurn } from "@/lib/session-summaries";
import { markIdempotencyDone } from "./chat-route-cache";
import { isAbortLikeError, logError, logInfo } from "./chat-route-logging";
import {
  getPersistedMessages,
  getRequiredChatCredits,
  resolveTotalTokens,
} from "./chat-route-model";
import { clearActiveStreamId, getActiveStreamId } from "./chat-stream-store";

type ExistingChat = NonNullable<
  Awaited<ReturnType<typeof getChatBySlugForUser>>
>;
type CreatedChat = Awaited<ReturnType<typeof createChatForUser>>;
interface PersistedChatModelStreamResult {
  totalUsage: PromiseLike<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }>;
}

interface HandlePersistedChatStreamFinishOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  chat: ExistingChat | CreatedChat;
  chatSlug: string;
  idempotencyLockAcquired: boolean;
  idempotencyRedisKey: string | null;
  isContinuation: boolean;
  messages: UIMessage[];
  originalMessages: UIMessage[];
  requestStartedAt: Date;
  responseMessage: UIMessage;
  result: PersistedChatModelStreamResult;
  selectedModel: ApolloModelName;
  sessionUser: {
    id: string;
  };
  streamId: string;
  workspace: {
    workspaceId: string;
  };
}

export async function handlePersistedChatStreamFinish({
  apiLogger,
  chat,
  chatSlug,
  idempotencyLockAcquired,
  idempotencyRedisKey,
  isContinuation,
  messages,
  originalMessages,
  requestStartedAt,
  responseMessage,
  result,
  selectedModel,
  sessionUser,
  streamId,
  workspace,
}: HandlePersistedChatStreamFinishOptions) {
  try {
    const persistedMessages = getPersistedMessages({
      originalMessages,
      streamedMessages: messages,
      responseMessage,
      isContinuation,
    });
    const activeStreamId = await getActiveStreamId(chatSlug);
    if (activeStreamId !== streamId) {
      logInfo("Skipped persisting stale stream messages", {
        chatId: chatSlug,
        messageCount: messages.length,
        streamId,
        activeStreamId,
      });
      return;
    }
    logInfo("Model stream finished", {
      chatId: chatSlug,
      messageCount: persistedMessages.length,
    });
    await saveMessagesForChatSlug(
      sessionUser.id,
      chatSlug,
      persistedMessages,
      workspace.workspaceId
    );
    await invalidateChatReadCaches(workspace.workspaceId);
    logInfo("Persisted streamed messages", {
      chatId: chatSlug,
      messageCount: persistedMessages.length,
    });

    try {
      const latestSummary = await getLatestSessionSummaryForChat(chat.id).catch(
        () => null
      );
      const latestUserPosition = Math.max(
        0,
        persistedMessages
          .map((message, index) => (message.role === "user" ? index : -1))
          .reduce((highest, index) => Math.max(highest, index), -1)
      );

      await persistSessionSummaryForCompletedTurn({
        chatId: chat.id,
        endedAt: new Date(),
        latestSummary,
        latestUserPosition,
        messages: persistedMessages,
        previousLastMessageAt: chat.lastMessageAt
          ? new Date(chat.lastMessageAt)
          : null,
        requestStartedAt,
        userId: sessionUser.id,
        workspaceId: workspace.workspaceId,
      });
    } catch (summaryError) {
      logError("Failed to persist session summary after stream", {
        chatId: chatSlug,
        error: summaryError,
      });
    }

    try {
      const totalUsage = await result.totalUsage;
      const totalTokens = resolveTotalTokens(totalUsage);
      const requiredCredits = getRequiredChatCredits(totalTokens);
      const additionalCredits = Math.max(0, requiredCredits - 1);

      if (additionalCredits > 0) {
        const meteredUsage = await consumeChatUnits(
          sessionUser.id,
          additionalCredits
        );
        if (!meteredUsage.ok) {
          logInfo("Chat usage over-limit after stream completion", {
            chatId: chatSlug,
            totalTokens,
            requiredCredits,
            additionalCredits,
          });
        }
      }

      logInfo("Applied token-based chat usage", {
        chatId: chatSlug,
        totalTokens,
        requiredCredits,
        additionalCredits,
      });
      apiLogger.meter("meter.chat.tokens", {
        chatId: chatSlug,
        model: selectedModel,
        inputTokens: totalUsage.inputTokens ?? null,
        outputTokens: totalUsage.outputTokens ?? null,
        totalTokens,
        creditsCharged: requiredCredits,
      });
      apiLogger.meter("meter.chat.request", {
        chatId: chatSlug,
        model: selectedModel,
        messageCount: persistedMessages.length,
      });
      apiLogger.featureUsed("chat", {
        chatId: chatSlug,
        model: selectedModel,
      });
    } catch (usageError) {
      if (isAbortLikeError(usageError)) {
        logInfo("Skipped token-based chat usage after abort", {
          chatId: chatSlug,
        });
      } else {
        logError("Failed to apply token-based chat usage", {
          chatId: chatSlug,
          error: usageError,
        });
      }
    }
  } catch (error) {
    logError("Failed to persist streamed chat messages", {
      chatId: chatSlug,
      error,
    });
  } finally {
    await clearActiveStreamId(chatSlug, streamId);
    if (idempotencyRedisKey && idempotencyLockAcquired) {
      await markIdempotencyDone(idempotencyRedisKey, chatSlug);
    }
    logInfo("Cleared active stream id", { chatId: chatSlug });
  }
}
