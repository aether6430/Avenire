import { getLatestSessionSummaryForChat } from "@avenire/database";
import { after, NextResponse } from "next/server";
import {
  getChatBySlugForUser,
  getMessagesByChatSlugForUser,
} from "@/lib/chat-data";
import type { createApiLogger } from "@/lib/observability";
import { persistSessionSummaryForCompletedTurn } from "@/lib/session-summaries";
import { buildSessionCloseKey, markSessionCloseSeen } from "./chat-route-cache";
import { formatError, logError, logWarn } from "./chat-route-logging";

interface HandleSessionCloseChatRequestOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  chatId: string;
  sessionId: string;
  userId: string;
  workspaceId: string;
}

export async function handleSessionCloseChatRequest({
  apiLogger,
  chatId,
  sessionId,
  userId,
  workspaceId,
}: HandleSessionCloseChatRequestOptions) {
  if (!chatId || chatId === "new" || !sessionId) {
    apiLogger.requestSucceeded(202, {
      chatId: chatId || null,
      kind: "session-close",
      ignored: true,
    });
    return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
  }

  const dedupeKey = buildSessionCloseKey({
    chatId,
    sessionId,
    userId,
    workspaceId,
  });
  const shouldProcess = await markSessionCloseSeen(dedupeKey);
  if (!shouldProcess) {
    apiLogger.requestSucceeded(202, {
      chatId,
      kind: "session-close",
      deduped: true,
    });
    return NextResponse.json({ ok: true, deduped: true }, { status: 202 });
  }

  const chat = await getChatBySlugForUser(userId, chatId, workspaceId);
  if (!chat) {
    apiLogger.requestFailed(404, "Chat not found", { chatId });
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await getMessagesByChatSlugForUser(
    userId,
    chatId,
    workspaceId
  );
  if (!messages || messages.length === 0) {
    apiLogger.requestSucceeded(202, {
      chatId,
      kind: "session-close",
      ignored: true,
    });
    return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
  }

  const latestSummary = await getLatestSessionSummaryForChat(chat.id).catch(
    (error) => {
      logWarn("Failed to load latest session summary; continuing without it", {
        chatId,
        error: formatError(error),
      });
      return null;
    }
  );
  const latestUserPosition = Math.max(
    0,
    messages
      .map((message, index) => (message.role === "user" ? index : -1))
      .reduce((highest, index) => Math.max(highest, index), -1)
  );

  apiLogger.requestSucceeded(202, {
    chatId,
    kind: "session-close",
    messageCount: messages.length,
  });

  after(async () => {
    try {
      await persistSessionSummaryForCompletedTurn({
        chatId: chat.id,
        endedAt: new Date(),
        latestSummary,
        latestUserPosition,
        messages,
        previousLastMessageAt: chat.lastMessageAt
          ? new Date(chat.lastMessageAt)
          : null,
        requestStartedAt: new Date(),
        forceNewSessionBoundary: true,
        userId,
        workspaceId,
      });
    } catch (error) {
      logError("Failed to persist session summary on session close", {
        chatId,
        error,
      });
    }
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
