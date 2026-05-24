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
import type { UIMessage } from "@avenire/ai/message-types";
import { NextResponse } from "next/server";
import { consumeChatUnits } from "@/lib/billing-metering";
import { createChatTools } from "@/lib/chat-tools";
import type { createApiLogger } from "@/lib/observability";
import {
  formatError,
  getChatStreamErrorMessage,
  logError,
} from "./chat-route-logging";
import {
  extractLatestUserText,
  getExpectedChatCredits,
  normalizeMessageFileMediaTypes,
  pickModelTools,
} from "./chat-route-model";

interface HandleEphemeralChatRequestOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  body: {
    messages?: UIMessage[];
    selectionBase64?: string | null;
    selectionMediaType?: string | null;
    selectedModel?: ApolloModelName;
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

export async function handleEphemeralChatRequest({
  apiLogger,
  body,
  request,
  sessionUser,
  workspace,
}: HandleEphemeralChatRequestOptions) {
  const originalMessages = normalizeMessageFileMediaTypes(body.messages ?? []);
  const selectedModel = body.selectedModel ?? "apollo-apex";
  const selectionBase64 = body.selectionBase64?.trim() ?? "";

  try {
    if (!selectionBase64) {
      apiLogger.requestFailed(400, "Missing selection image");
      return NextResponse.json(
        { error: "Missing selection image" },
        { status: 400 }
      );
    }

    const initialUsage = await consumeChatUnits(
      sessionUser.id,
      getExpectedChatCredits(originalMessages, selectedModel)
    );
    if (!initialUsage.ok) {
      const retryAfter = initialUsage.retryAfter?.toISOString() ?? null;
      apiLogger.rateLimited("chat", retryAfter, { chatId: "ephemeral" });
      return NextResponse.json(
        {
          error: "Chat usage limit reached",
          retryAfter,
        },
        { status: 429 }
      );
    }

    const selectionMediaType = body.selectionMediaType?.trim() || "image/png";
    const selectionBuffer = Buffer.from(selectionBase64, "base64");
    const latestUserText = extractLatestUserText(originalMessages);
    const selectionTools = createChatTools({
      agentActivityId: randomUUID(),
      chatSlug: `selection-ephemeral:${randomUUID()}`,
      emitAgentActivity: () => undefined,
      rootFolderId: workspace.rootFolderId,
      userId: sessionUser.id,
      workspaceId: workspace.workspaceId,
    });
    const priorMessages = await convertToModelMessages(
      originalMessages.slice(0, -1),
      {
        tools: selectionTools,
      }
    );
    const selectionPrompt = latestUserText.trim();
    const selectionSystemPrompt = APOLLO_PROMPT(
      body.userName ?? sessionUser.name ?? undefined,
      [
        "The selected image is evidence, not the task.",
        "Answer the user's text request directly and use the image only when it helps justify the answer.",
        "Do not respond with only an image description unless the user explicitly asks for one.",
      ].join(" "),
      {
        allowVisualizations: false,
      }
    );
    const result = streamText({
      model: apollo.languageModel(selectedModel),
      system: selectionSystemPrompt,
      messages: [
        ...priorMessages,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: selectionPrompt || "Inspect the selected crop.",
            },
            {
              type: "image",
              image: selectionBuffer,
              mediaType: selectionMediaType,
            },
          ],
        },
      ],
      tools: pickModelTools(selectionTools, [
        "show_widget",
        "visualize_read_me",
      ]),
      maxOutputTokens: 5000,
      stopWhen: stepCountIs(8),
      temperature: 0.2,
      abortSignal: request.signal,
      experimental_transform: smoothStream({
        delayInMs: null,
        chunking: "word",
      }),
      onError: ({ error }) => {
        logError("Selection inspection stream failed", {
          error: formatError(error),
          model: selectedModel,
          providerModel: APOLLO_LANGUAGE_MODEL_IDS[selectedModel],
        });
      },
    });

    apiLogger.requestSucceeded(200, {
      chatId: "ephemeral",
      selectedModel,
    });

    return result.toUIMessageStreamResponse({
      originalMessages,
      onError: getChatStreamErrorMessage,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("Failed to inspect selection", {
      error: formatError(error),
      model: selectedModel,
      providerModel: APOLLO_LANGUAGE_MODEL_IDS[selectedModel],
    });
    apiLogger.requestFailed(500, error, {
      chatId: "ephemeral",
      selectedModel,
    });
    return NextResponse.json(
      { error: "Failed to inspect selection" },
      { status: 500 }
    );
  }
}
