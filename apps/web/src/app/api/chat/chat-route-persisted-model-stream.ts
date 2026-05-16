import { randomUUID } from "node:crypto";
import {
  APOLLO_LANGUAGE_MODEL_IDS,
  APOLLO_PROMPT,
  type ApolloModelName,
  apollo,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
} from "@avenire/ai";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { createChatTools } from "@/lib/chat-tools";
import type { createApiLogger } from "@/lib/observability";
import { buildRecentSessionSummaryContext } from "@/lib/session-summaries";
import { getCachedLearningPromptMemoryBlocks } from "./chat-route-cache";
import { formatError, logError, logInfo, logWarn } from "./chat-route-logging";
import {
  modelUsesLegacyWidgetSchema,
  pickModelTools,
} from "./chat-route-model";
import type { PersistedChatStartupContext } from "./chat-route-persisted-context";
import { clearActiveStreamId } from "./chat-stream-store";

const CHAT_STARTUP_CONTEXT_TIMEOUT_MS = 1200;

interface CreatePersistedChatModelStreamOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  body: {
    selectedModel?: ApolloModelName;
    userName?: string;
  };
  chatSlug: string;
  modelContextMessages: UIMessage[];
  request: Request;
  sessionUser: {
    id: string;
    name?: string | null;
  };
  startupContext: PersistedChatStartupContext;
  streamId: string;
  workspace: {
    rootFolderId: string;
    workspaceId: string;
  };
  writer: unknown;
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

export async function createPersistedChatModelStream({
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
}: CreatePersistedChatModelStreamOptions) {
  const streamWriter = writer as {
    write: (part: {
      type: string;
      id?: string;
      data?: unknown;
      transient?: boolean;
    }) => void;
  };
  const selectedModel = body.selectedModel ?? "apollo-apex";
  logInfo("Starting model stream", {
    chatId: chatSlug,
    model: selectedModel,
    providerModel: APOLLO_LANGUAGE_MODEL_IDS[selectedModel],
  });

  const agentActivityId = randomUUID();
  const emitAgentActivity = (data: AgentActivityData) => {
    streamWriter.write({
      type: "data-agent_activity",
      id: data.id,
      data,
      transient: true,
    });
  };

  const tools = createChatTools(
    {
      chatSlug,
      agentActivityId,
      emitAgentActivity,
      rootFolderId: workspace.rootFolderId,
      userId: sessionUser.id,
      workspaceId: workspace.workspaceId,
    },
    {
      legacyShowWidgetSchema: modelUsesLegacyWidgetSchema(selectedModel),
    }
  );
  const modelTools = pickModelTools(tools);
  const modelMessagesPromise = convertToModelMessages(modelContextMessages, {
    tools,
  });
  const promptMemoryBlocksPromise = withStartupTimeout(
    getCachedLearningPromptMemoryBlocks({
      recentSummaryContext: buildRecentSessionSummaryContext(
        startupContext.recentRelevantSummary
      ),
      recentSummaryUpdatedAt:
        startupContext.recentRelevantSummary?.updatedAt ?? null,
      subject: startupContext.resolvedSubject,
      topic: startupContext.resolvedTopic,
      userId: sessionUser.id,
      workspaceId: workspace.workspaceId,
    }),
    "learning-prompt-memory",
    []
  );

  try {
    const [modelMessages, promptMemoryBlocks] = await Promise.all([
      modelMessagesPromise,
      promptMemoryBlocksPromise,
    ]);

    const result = streamText({
      model: apollo.languageModel(selectedModel),
      system: APOLLO_PROMPT(
        body.userName ?? sessionUser.name ?? undefined,
        promptMemoryBlocks.length > 0 ? promptMemoryBlocks : undefined,
        {
          useWidgetSpec: !modelUsesLegacyWidgetSchema(selectedModel),
        }
      ),
      messages: modelMessages,
      maxOutputTokens: 10_000,
      stopWhen: stepCountIs(8),
      tools: modelTools,
      abortSignal: request.signal,
      experimental_transform: smoothStream({
        delayInMs: null,
        chunking: "word",
      }),
      onChunk: async ({ chunk }) => {
        try {
          if (chunk.type === "tool-call") {
            logInfo("Streaming tool call chunk", {
              chatId: chatSlug,
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
            });
          }

          if (chunk.type === "tool-result") {
            logInfo("Streaming tool result chunk", {
              chatId: chatSlug,
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
            });
          }
        } catch (_error) {}
      },
      onError: ({ error }) => {
        logError("Chat model stream failed", {
          chatId: chatSlug,
          error: formatError(error),
          model: selectedModel,
          providerModel: APOLLO_LANGUAGE_MODEL_IDS[selectedModel],
        });
      },
    });

    return { result, selectedModel };
  } catch (error) {
    await clearActiveStreamId(chatSlug, streamId);
    logError("Failed to start model stream", {
      chatId: chatSlug,
      model: selectedModel,
      error,
    });
    apiLogger.requestFailed(500, error, { chatId: chatSlug });
    throw error;
  }
}
