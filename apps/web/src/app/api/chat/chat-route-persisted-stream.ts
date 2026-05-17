import { randomUUID } from "node:crypto";
import type { ApolloModelName } from "@avenire/ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "@avenire/ai";
import type { UIMessage } from "@avenire/ai/message-types";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import {
  type createChatForUser,
  type getChatBySlugForUser,
  saveMessagesForChatSlug,
  updateChatForUser,
} from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import type { createApiLogger } from "@/lib/observability";
import { clearIdempotencyKey, markIdempotencyDone } from "./chat-route-cache";
import {
  formatError,
  getChatStreamErrorMessage,
  isAbortLikeError,
  logError,
  logInfo,
  logWarn,
} from "./chat-route-logging";
import {
  generateChatMetadata,
  generateChatThinkingMessages,
} from "./chat-route-metadata";
import {
  DEFAULT_THINKING_MESSAGES,
  shouldGenerateTitle,
} from "./chat-route-model";
import type { PersistedChatStartupContext } from "./chat-route-persisted-context";
import { handlePersistedChatStreamFinish } from "./chat-route-persisted-finish";
import { createPersistedChatModelStream } from "./chat-route-persisted-model-stream";
import {
  clearActiveStreamId,
  getActiveStreamId,
  getRedisClient,
  getRedisSubscriber,
  hasChatStreamStoreConfig,
  setActiveStreamId,
} from "./chat-stream-store";

type ExistingChat = NonNullable<
  Awaited<ReturnType<typeof getChatBySlugForUser>>
>;
type CreatedChat = Awaited<ReturnType<typeof createChatForUser>>;

interface BuildPersistedChatStreamResponseOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  body: {
    chatId?: string;
    selectedModel?: ApolloModelName;
    userName?: string;
  };
  chat: ExistingChat | CreatedChat;
  chatCreatedFromNew: boolean;
  chatSlug: string;
  idempotencyLockAcquired: boolean;
  idempotencyRedisKey: string | null;
  modelContextMessages: UIMessage[];
  originalMessages: UIMessage[];
  request: Request;
  requestStartedAt: Date;
  sessionUser: {
    id: string;
    name?: string | null;
  };
  startupContext: PersistedChatStartupContext;
  workspace: {
    rootFolderId: string;
    workspaceId: string;
  };
}

export async function buildPersistedChatStreamResponse({
  apiLogger,
  body,
  chat,
  chatCreatedFromNew,
  chatSlug,
  idempotencyLockAcquired,
  idempotencyRedisKey,
  modelContextMessages,
  originalMessages,
  request,
  requestStartedAt,
  sessionUser,
  startupContext,
  workspace,
}: BuildPersistedChatStreamResponseOptions): Promise<Response> {
  const streamId = randomUUID();
  let streamSettled = false;
  const previousStreamId = await getActiveStreamId(chatSlug);
  await setActiveStreamId(chatSlug, streamId);
  if (previousStreamId) {
    await clearActiveStreamId(chatSlug, previousStreamId);
  }

  request.signal.addEventListener(
    "abort",
    () => {
      void clearActiveStreamId(chatSlug, streamId);
      logInfo("Chat request aborted", { chatId: chatSlug, streamId });
      if (idempotencyRedisKey && idempotencyLockAcquired) {
        void clearIdempotencyKey(idempotencyRedisKey);
      }
    },
    { once: true }
  );

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      const finalizeFailedStream = async (error: unknown) => {
        if (streamSettled) {
          return;
        }
        streamSettled = true;

        try {
          const activeStreamId = await getActiveStreamId(chatSlug);
          if (activeStreamId && activeStreamId !== streamId) {
            logInfo("Skipped persisting stale failed stream", {
              chatId: chatSlug,
              streamId,
              activeStreamId,
            });
            return;
          }

          if (!isAbortLikeError(error)) {
            const errorMessage = getChatStreamErrorMessage(error);
            await saveMessagesForChatSlug(
              sessionUser.id,
              chatSlug,
              [
                ...originalMessages,
                {
                  id: randomUUID(),
                  parts: [{ text: errorMessage, type: "text" }],
                  role: "assistant",
                } as UIMessage,
              ],
              workspace.workspaceId
            );
            await invalidateChatReadCaches(workspace.workspaceId);
            logInfo("Persisted failed streamed message", {
              chatId: chatSlug,
            });
          }
        } catch (persistError) {
          logError("Failed to persist failed streamed message", {
            chatId: chatSlug,
            error: formatError(persistError),
          });
        } finally {
          await clearActiveStreamId(chatSlug, streamId);
          if (idempotencyRedisKey && idempotencyLockAcquired) {
            await markIdempotencyDone(idempotencyRedisKey, chatSlug);
          }
          logInfo("Cleared active stream id after stream failure", {
            chatId: chatSlug,
            streamId,
          });
        }
      };

      const shouldGenerateChatTitle = shouldGenerateTitle(
        chat.title,
        originalMessages
      );
      const thinkingMessagesPromise = generateChatThinkingMessages(
        startupContext.latestUserText,
        request.signal
      );

      const streamChatMetadata = async () => {
        if (!shouldGenerateChatTitle) {
          return;
        }

        try {
          const nextMeta = await generateChatMetadata(
            startupContext.latestUserText,
            request.signal
          );
          if (!nextMeta?.title) {
            return;
          }

          logInfo("Streaming generated chat title event", {
            chatId: chatSlug,
            nameLength: nextMeta.title.length,
          });
          writer.write({
            type: "data-chatName",
            transient: true,
            data: {
              id: chatSlug,
              name: nextMeta.title,
              icon: nextMeta.icon,
            },
          });

          await updateChatForUser(
            sessionUser.id,
            chatSlug,
            {
              title: nextMeta.title,
              icon: nextMeta.icon,
            },
            workspace.workspaceId
          );
          await invalidateChatReadCaches(workspace.workspaceId);
          logInfo("Persisted generated chat title", {
            chatId: chatSlug,
            name: nextMeta.title,
          });
        } catch (error) {
          logWarn("Failed to stream generated chat title", {
            chatId: chatSlug,
            error: formatError(error),
          });
        }
      };

      if (chatCreatedFromNew) {
        writer.write({
          type: "data-chatCreated",
          transient: true,
          data: {
            fromId: body.chatId?.trim() ?? "new",
            id: chatSlug,
            title: chat.title,
          },
        });
      }

      writer.write({
        type: "data-thinkingMessages",
        transient: true,
        data: {
          id: chatSlug,
          messages: DEFAULT_THINKING_MESSAGES,
        },
      });

      void (async () => {
        try {
          const nextThinkingMessages = await thinkingMessagesPromise;
          if (!nextThinkingMessages?.length) {
            return;
          }

          writer.write({
            type: "data-thinkingMessages",
            transient: true,
            data: {
              id: chatSlug,
              messages: nextThinkingMessages,
            },
          });
        } catch (error) {
          logWarn("Failed to stream thinking messages", {
            chatId: chatSlug,
            error: formatError(error),
          });
        }
      })();

      const { result, selectedModel } = await createPersistedChatModelStream({
        apiLogger,
        body,
        chatSlug,
        modelContextMessages,
        request,
        sessionUser,
        startupContext,
        streamId,
        workspace,
        writer,
      });

      writer.merge(
        result.toUIMessageStream({
          originalMessages,
          generateMessageId: randomUUID,
          onError: (error) => {
            const errorMessage = getChatStreamErrorMessage(error);
            void finalizeFailedStream(error);
            return errorMessage;
          },
          onFinish: async ({ messages, responseMessage, isContinuation }) => {
            streamSettled = true;
            await handlePersistedChatStreamFinish({
              apiLogger,
              chat,
              chatSlug,
              idempotencyLockAcquired,
              idempotencyRedisKey,
              isContinuation,
              messages: messages as unknown as UIMessage[],
              originalMessages,
              requestStartedAt,
              responseMessage: responseMessage as unknown as UIMessage,
              result,
              selectedModel,
              sessionUser,
              streamId,
              workspace,
            });
          },
        })
      );

      void streamChatMetadata();
    },
  });

  const baseResponse = createUIMessageStreamResponse({ stream });
  if (!baseResponse.body) {
    await clearActiveStreamId(chatSlug, streamId);
    return baseResponse;
  }

  const [clientBody, resumableBody] = baseResponse.body.tee();
  const resumableTextStream = resumableBody.pipeThrough(
    new TextDecoderStream()
  );

  if (hasChatStreamStoreConfig()) {
    void (async () => {
      try {
        const streamContext = createResumableStreamContext({
          waitUntil: after,
          publisher: await getRedisClient(),
          subscriber: await getRedisSubscriber(),
        });

        await streamContext.createNewResumableStream(
          streamId,
          () => resumableTextStream
        );
      } catch (error) {
        await clearActiveStreamId(chatSlug, streamId);
        logError("Failed to create resumable chat stream", {
          chatSlug,
          streamId,
          error: formatError(error),
        });
      }
    })();
  }

  apiLogger.requestSucceeded(200, {
    chatId: chatSlug,
    selectedModel: body.selectedModel ?? "apollo-apex",
    messageCount: originalMessages.length,
  });

  return new Response(clientBody, {
    status: baseResponse.status,
    statusText: baseResponse.statusText,
    headers: baseResponse.headers,
  });
}
