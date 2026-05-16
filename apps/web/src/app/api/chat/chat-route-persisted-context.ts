import type { UIMessage } from "@avenire/ai/message-types";
import { getRecentRelevantSessionSummary } from "@avenire/database";
import { getWorkspaceSubjectSummary } from "@/lib/session-summaries";
import {
  inferTopicLabel,
  normalizeSubjectLabel,
} from "@/lib/subject-detection";
import { formatError, logInfo, logWarn } from "./chat-route-logging";
import { extractLatestUserText } from "./chat-route-model";

const CHAT_STARTUP_CONTEXT_TIMEOUT_MS = 1200;

type WorkspaceSubjectSummary = Awaited<
  ReturnType<typeof getWorkspaceSubjectSummary>
>;
type RecentRelevantSessionSummary = Awaited<
  ReturnType<typeof getRecentRelevantSessionSummary>
>;

interface LoadPersistedChatStartupContextOptions {
  chatDbId: string | number;
  chatSlug: string;
  messages: UIMessage[];
  modelContextMessages: UIMessage[];
  selectedModel?: string | null;
  sessionUserId: string;
  workspaceId: string;
}

export interface PersistedChatStartupContext {
  latestUserText: string;
  recentRelevantSummary: RecentRelevantSessionSummary;
  resolvedSubject: string | null;
  resolvedTopic: string | null;
  workspaceSubjectSummary: WorkspaceSubjectSummary;
}

async function withStartupTimeout<T>(
  promise: Promise<T>,
  label: string,
  fallback: T,
  timeoutMs = CHAT_STARTUP_CONTEXT_TIMEOUT_MS
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => {
          logWarn("Startup context timed out; continuing without it", {
            label,
            timeoutMs,
          });
          resolve(fallback);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function loadPersistedChatStartupContext({
  chatDbId,
  chatSlug,
  messages,
  modelContextMessages,
  selectedModel,
  sessionUserId,
  workspaceId,
}: LoadPersistedChatStartupContextOptions): Promise<PersistedChatStartupContext> {
  const workspaceSubjectSummary = await withStartupTimeout(
    getWorkspaceSubjectSummary({
      userId: sessionUserId,
      workspaceId,
    }).catch((error) => {
      logWarn(
        "Failed to load workspace subject summary; continuing without it",
        {
          chatId: chatDbId,
          error: formatError(error),
        }
      );
      return null;
    }),
    "workspace-subject-summary",
    null
  );

  const resolvedSubject = normalizeSubjectLabel(
    workspaceSubjectSummary?.subject ?? null
  );
  const latestUserText = extractLatestUserText(messages);

  logInfo("Incoming chat request", {
    chatId: chatSlug,
    selectedModel: selectedModel ?? null,
    messageCount: messages.length,
    modelContextCount: modelContextMessages.length,
    workspaceSubjectSummary,
    resolvedSubject,
  });

  const recentRelevantSummary = resolvedSubject
    ? await withStartupTimeout(
        getRecentRelevantSessionSummary({
          subject: resolvedSubject,
          userId: sessionUserId,
          workspaceId,
        }).catch((error) => {
          logWarn(
            "Failed to load recent relevant session summary; continuing without it",
            {
              chatId: chatDbId,
              error: formatError(error),
              subject: resolvedSubject,
            }
          );
          return null;
        }),
        "recent-relevant-session-summary",
        null
      )
    : null;

  const resolvedTopic = inferTopicLabel(
    [latestUserText, recentRelevantSummary?.summaryText]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join("\n\n"),
    resolvedSubject
  );

  return {
    latestUserText,
    recentRelevantSummary,
    resolvedSubject,
    resolvedTopic,
    workspaceSubjectSummary,
  };
}
