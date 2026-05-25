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
import { consumeChatUnits } from "@/lib/billing-metering";
import { createChatTools } from "@/lib/chat-tools";
import { detectMisconceptionSignals } from "@/lib/misconception-signal-detector";
import type { createApiLogger } from "@/lib/observability";
import { buildRecentSessionSummaryContext } from "@/lib/session-summary-model";
import { getCachedLearningPromptMemoryBlocks } from "./chat-route-cache";
import { formatError, logError, logInfo, logWarn } from "./chat-route-logging";
import {
  getModelCreditMultiplier,
  pickModelTools,
  resolveWidgetGenerationCredits,
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

  const tools = createChatTools({
    chatSlug,
    agentActivityId,
    chargeWidgetGeneration: async () => {
      const widgetGenerationCredits = resolveWidgetGenerationCredits();
      const usage = await consumeChatUnits(
        sessionUser.id,
        widgetGenerationCredits
      );
      if (!usage.ok) {
        logInfo("Widget generation over usage limit", {
          chatId: chatSlug,
          credits: widgetGenerationCredits,
          retryAfter: usage.retryAfter?.toISOString() ?? null,
        });
        throw new Error("Chat usage limit reached");
      }
      apiLogger.meter("meter.chat.widget", {
        chatId: chatSlug,
        creditsCharged: widgetGenerationCredits,
        model: selectedModel,
        creditMultiplier: getModelCreditMultiplier(selectedModel),
      });
    },
    emitAgentActivity,
    rootFolderId: workspace.rootFolderId,
    userId: sessionUser.id,
    workspaceId: workspace.workspaceId,
  });
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
    const [modelMessages, promptMemoryBlocks, misconceptionSignal] =
      await Promise.all([
        modelMessagesPromise,
        promptMemoryBlocksPromise,
        withStartupTimeout(
          detectMisconceptionSignals({
            abortSignal: request.signal,
            latestUserText: startupContext.latestUserText,
            subject: startupContext.resolvedSubject,
            topic: startupContext.resolvedTopic,
            userId: sessionUser.id,
            workspaceId: workspace.workspaceId,
          }).catch((error) => {
            logWarn(
              "Failed to detect real-time misconception signal; continuing without it",
              {
                chatId: chatSlug,
                error: formatError(error),
                subject: startupContext.resolvedSubject,
                topic: startupContext.resolvedTopic,
              }
            );
            return null;
          }),
          "misconception-signal-detector",
          null,
          850
        ),
      ]);
    const promptBlocksForPrompt = misconceptionSignal?.interventionBlock
      ? [...promptMemoryBlocks, misconceptionSignal.interventionBlock]
      : promptMemoryBlocks;

    logInfo("Resolved misconception signal for prompt memory", {
      chatId: chatSlug,
      misconceptionSignalCandidateCount:
        misconceptionSignal?.candidates.length ?? 0,
      misconceptionSignalMatched: misconceptionSignal?.matched ?? false,
      resolvedSubject: startupContext.resolvedSubject,
      resolvedTopic: startupContext.resolvedTopic,
    });

    const result = streamText({
      model: apollo.languageModel(selectedModel),
      system: APOLLO_PROMPT(
        body.userName ?? sessionUser.name ?? undefined,
        promptBlocksForPrompt.length > 0 ? promptBlocksForPrompt : undefined
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
