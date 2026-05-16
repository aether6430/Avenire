import { apollo, generateText, streamText } from "@avenire/ai";
import type { createApiLogger } from "@/lib/observability";
import type { RetrievalSummaryEvidence } from "./retrieval-summary-evidence";
import {
  buildRetrievalSummaryPrompt,
  FALLBACK_SUMMARY,
  flagInvalidCitations,
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
      onFinish: ({ text }) => {
        flagInvalidCitations({
          allowedFileIds: fileIds,
          text,
        });
      },
    });

    void apiLogger.requestSucceeded(200, {
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

  flagInvalidCitations({
    allowedFileIds: fileIds,
    text: summary,
  });

  void apiLogger.requestSucceeded(200, {
    workspaceUuid,
    generationLatencyMs,
    modelName: RETRIEVAL_SUMMARY_MODEL_ALIAS,
    provider: "apollo",
    attachedFileCount: attachedFiles.length,
    textualEvidenceCount: textualEvidence.length,
  });

  return summaryResponse(summary, stream);
}
