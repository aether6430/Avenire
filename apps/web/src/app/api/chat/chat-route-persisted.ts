import type { ApolloModelName } from "@avenire/ai";
import type { UIMessage } from "@avenire/ai/message-types";
import { NextResponse } from "next/server";
import { consumeChatUnits } from "@/lib/billing-metering";
import {
  createChatForUser,
  getChatBySlugForUser,
  isChatOwnerForUser,
  saveMessagesForChatSlug,
} from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import type { createApiLogger } from "@/lib/observability";
import {
  buildChatIdempotencyRedisKey,
  clearIdempotencyKey,
  getIdempotencyState,
  tryAcquireIdempotencyLock,
} from "./chat-route-cache";
import { formatError, logError, logInfo } from "./chat-route-logging";
import {
  DEFAULT_CHAT_TITLE,
  normalizeMessageFileMediaTypes,
  stripNonHttpFileParts,
  trimMessagesForModelContext,
} from "./chat-route-model";
import { loadPersistedChatStartupContext } from "./chat-route-persisted-context";
import { buildPersistedChatStreamResponse } from "./chat-route-persisted-stream";

interface HandlePersistedChatRequestOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  body: {
    messages?: UIMessage[];
    selectedModel?: ApolloModelName;
    chatId?: string;
    userName?: string;
  };
  request: Request;
  sessionUser: {
    id: string;
    name?: string | null;
  };
  workspace: {
    rootFolderId: string;
    workspaceId: string;
  };
}

export async function handlePersistedChatRequest({
  apiLogger,
  body,
  request,
  sessionUser,
  workspace,
}: HandlePersistedChatRequestOptions) {
  let idempotencyRedisKey: string | null = null;
  let idempotencyLockAcquired = false;

  try {
    let chatSlug: string = body.chatId?.trim() ?? "";
    if (!chatSlug) {
      apiLogger.requestFailed(400, "Missing chatId");
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const idempotencyHeader = request.headers.get("idempotency-key")?.trim();
    const originalMessages = stripNonHttpFileParts(
      normalizeMessageFileMediaTypes(body.messages ?? [])
    );
    const modelContextMessages = trimMessagesForModelContext(originalMessages);

    type ExistingChat = NonNullable<
      Awaited<ReturnType<typeof getChatBySlugForUser>>
    >;
    type CreatedChat = Awaited<ReturnType<typeof createChatForUser>>;
    let chat: ExistingChat | CreatedChat | null = null;
    let chatCreatedFromNew = false;

    if (chatSlug === "new") {
      if (idempotencyHeader) {
        idempotencyRedisKey = buildChatIdempotencyRedisKey({
          userId: sessionUser.id,
          workspaceId: workspace.workspaceId,
          chatSlug,
          idempotencyKey: idempotencyHeader,
        });

        const state = await getIdempotencyState(idempotencyRedisKey);
        if (state) {
          apiLogger.requestFailed(409, "Duplicate request", {
            chatId: chatSlug,
            idempotencyKey: idempotencyHeader,
          });
          return NextResponse.json(
            {
              error: "Duplicate request",
              chatId: chatSlug,
            },
            { status: 409 }
          );
        }

        idempotencyLockAcquired =
          await tryAcquireIdempotencyLock(idempotencyRedisKey);
        if (!idempotencyLockAcquired) {
          apiLogger.requestFailed(409, "Request in progress", {
            chatId: chatSlug,
            idempotencyKey: idempotencyHeader,
          });
          return NextResponse.json(
            {
              error: "Request already in progress",
              chatId: chatSlug,
            },
            { status: 409 }
          );
        }
      }

      const createdChat = await createChatForUser(
        sessionUser.id,
        workspace.workspaceId,
        DEFAULT_CHAT_TITLE
      );
      await invalidateChatReadCaches(workspace.workspaceId);
      chat = createdChat;
      chatCreatedFromNew = true;
      chatSlug = createdChat.slug;
    } else {
      chat = await getChatBySlugForUser(
        sessionUser.id,
        chatSlug,
        workspace.workspaceId
      );

      if (!chat) {
        apiLogger.requestFailed(404, "Method not found", {
          chatId: chatSlug,
        });
        return NextResponse.json(
          { error: "Method not found" },
          { status: 404 }
        );
      }
      if (
        Boolean(chat.readOnly) ||
        !(await isChatOwnerForUser(
          sessionUser.id,
          chatSlug,
          workspace.workspaceId
        ))
      ) {
        apiLogger.requestFailed(403, "Read-only method", {
          chatId: chatSlug,
        });
        return NextResponse.json(
          { error: "Read-only method" },
          { status: 403 }
        );
      }
    }

    if (!chat) {
      apiLogger.requestFailed(500, "Unable to resolve method", {
        chatId: chatSlug,
      });
      return NextResponse.json(
        { error: "Unable to resolve method" },
        { status: 500 }
      );
    }

    const requestStartedAt = new Date();
    const startupContext = await loadPersistedChatStartupContext({
      chatDbId: chat.id,
      chatSlug,
      messages: originalMessages,
      modelContextMessages,
      selectedModel: body.selectedModel ?? null,
      sessionUserId: sessionUser.id,
      workspaceId: workspace.workspaceId,
    });

    if (idempotencyHeader && !idempotencyRedisKey) {
      idempotencyRedisKey = buildChatIdempotencyRedisKey({
        userId: sessionUser.id,
        workspaceId: workspace.workspaceId,
        chatSlug,
        idempotencyKey: idempotencyHeader,
      });

      const state = await getIdempotencyState(idempotencyRedisKey);
      if (state) {
        apiLogger.requestFailed(409, "Duplicate request", {
          chatId: chatSlug,
          idempotencyKey: idempotencyHeader,
        });
        return NextResponse.json(
          {
            error: "Duplicate request",
            chatId: chatSlug,
          },
          { status: 409 }
        );
      }

      idempotencyLockAcquired =
        await tryAcquireIdempotencyLock(idempotencyRedisKey);
      if (!idempotencyLockAcquired) {
        apiLogger.requestFailed(409, "Request in progress", {
          chatId: chatSlug,
          idempotencyKey: idempotencyHeader,
        });
        return NextResponse.json(
          {
            error: "Request already in progress",
            chatId: chatSlug,
          },
          { status: 409 }
        );
      }
    }

    const initialUsage = await consumeChatUnits(sessionUser.id, 1);
    if (!initialUsage.ok) {
      const retryAfter = initialUsage.retryAfter?.toISOString() ?? null;
      apiLogger.rateLimited("chat", retryAfter, { chatId: chatSlug });
      if (idempotencyRedisKey && idempotencyLockAcquired) {
        await clearIdempotencyKey(idempotencyRedisKey);
      }
      return NextResponse.json(
        {
          error: "Chat usage limit reached",
          retryAfter,
        },
        { status: 429 }
      );
    }

    if (originalMessages.length > 0) {
      try {
        await saveMessagesForChatSlug(
          sessionUser.id,
          chatSlug,
          originalMessages,
          workspace.workspaceId
        );
        await invalidateChatReadCaches(workspace.workspaceId);
        logInfo("Persisted user messages before stream", {
          chatId: chatSlug,
          messageCount: originalMessages.length,
        });
      } catch (error) {
        logError("Failed to persist user messages before stream", {
          chatId: chatSlug,
          error,
        });
        if (idempotencyRedisKey && idempotencyLockAcquired) {
          await clearIdempotencyKey(idempotencyRedisKey);
        }
        apiLogger.requestFailed(500, "Failed to save user messages", {
          chatId: chatSlug,
        });
        return NextResponse.json(
          { error: "Failed to save user messages" },
          { status: 500 }
        );
      }
    }

    return await buildPersistedChatStreamResponse({
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
    });
  } catch (error) {
    logError("Unhandled persisted chat POST error", {
      error: formatError(error),
    });
    if (idempotencyRedisKey && idempotencyLockAcquired) {
      await clearIdempotencyKey(idempotencyRedisKey);
    }
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
