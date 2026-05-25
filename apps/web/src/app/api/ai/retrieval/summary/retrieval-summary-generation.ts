import {
  apollo,
  generateText,
  streamText,
  validateWorkspaceFileCitations,
} from "@avenire/ai";
import type { createApiLogger } from "@/lib/observability";
import type { RetrievalSummaryEvidence } from "./retrieval-summary-evidence";
import {
  buildRetrievalSummaryPrompt,
  FALLBACK_SUMMARY,
  RETRIEVAL_SUMMARY_MODEL_ALIAS,
  summaryResponse,
} from "./retrieval-summary-model";

interface GenerateRetrievalSummaryResponseOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  attachedFiles: RetrievalSummaryEvidence["attachedFiles"];
  fileIds: string[];
  query: string;
  stream?: boolean;
  textualEvidence: string[];
  workspaceUuid: string;
}

function warnOnInvalidCitations(input: {
  apiLogger: ReturnType<typeof createApiLogger>;
  allowedFileIds: string[];
  text: string;
  workspaceUuid: string;
}) {
  const validation = validateWorkspaceFileCitations({
    allowedFileIds: input.allowedFileIds,
    text: input.text,
  });

  if (!validation.valid) {
    void input.apiLogger.warn("retrieval.summary.invalid_citations", {
      invalidFileIds: validation.invalidFileIds,
      workspaceUuid: input.workspaceUuid,
    });
  }
}

export async function generateRetrievalSummaryResponse({
  apiLogger,
  attachedFiles,
  fileIds,
  query,
  stream,
  textualEvidence,
  workspaceUuid,
}: GenerateRetrievalSummaryResponseOptions) {
  const summaryPrompt = buildRetrievalSummaryPrompt({
    query,
    textualEvidence,
  });

  if (stream) {
    const result = streamText({
      model: apollo.languageModel(RETRIEVAL_SUMMARY_MODEL_ALIAS),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: summaryPrompt,
            },
            ...attachedFiles,
          ],
        },
      ],
      temperature: 0.2,
      maxOutputTokens: 220,
      onError: ({ error }) => {
        void apiLogger.warn("retrieval.summary.stream_error", {
          error:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : { message: "Unknown retrieval summary stream error" },
          workspaceUuid,
        });
      },
      onFinish: ({ text }) => {
        warnOnInvalidCitations({
          apiLogger,
          allowedFileIds: fileIds,
          text,
          workspaceUuid,
        });
      },
    });

    await apiLogger.requestSucceeded(200, {
      workspaceUuid,
      modelName: RETRIEVAL_SUMMARY_MODEL_ALIAS,
      provider: "apollo",
      attachedFileCount: attachedFiles.length,
      textualEvidenceCount: textualEvidence.length,
      streaming: true,
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const generationStartedAt = performance.now();
  const { text } = await generateText({
    model: apollo.languageModel(RETRIEVAL_SUMMARY_MODEL_ALIAS),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: summaryPrompt,
          },
          ...attachedFiles,
        ],
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 220,
  });
  const generationLatencyMs = Math.round(
    performance.now() - generationStartedAt
  );
  const summary = text.trim() || FALLBACK_SUMMARY;

  warnOnInvalidCitations({
    apiLogger,
    allowedFileIds: fileIds,
    text: summary,
    workspaceUuid,
  });

  await apiLogger.requestSucceeded(200, {
    workspaceUuid,
    generationLatencyMs,
    modelName: RETRIEVAL_SUMMARY_MODEL_ALIAS,
    provider: "apollo",
    attachedFileCount: attachedFiles.length,
    textualEvidenceCount: textualEvidence.length,
  });

  return summaryResponse(summary, stream);
}
