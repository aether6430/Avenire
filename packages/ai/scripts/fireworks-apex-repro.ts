import { createFireworks } from "@ai-sdk/fireworks";
import { streamText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { APOLLO_PROMPT } from "../prompts";
import { chatTools } from "../tools";

const modelId = "accounts/fireworks/models/kimi-k2p5";
const fireworks = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY,
});

const promptCases = [
  {
    name: "minimal",
    messages: [
      {
        role: "user" as const,
        content: "In one sentence, say hello.",
      },
    ],
  },
  {
    name: "adamw-context",
    messages: [
      {
        role: "user" as const,
        content:
          "Explain the practical difference between Adam and AdamW for a CS student. Keep it concise.",
      },
      {
        role: "assistant" as const,
        content:
          "Adam couples weight decay into the adaptive gradient update, while AdamW applies it separately.",
      },
      {
        role: "user" as const,
        content:
          "Now explain why decoupled weight decay makes regularization strength more consistent.",
      },
    ],
  },
  {
    name: "route-shaped-memory",
    messages: [
      {
        role: "user" as const,
        content: [
          "Workspace subject summary:",
          "Subject: Computer Science",
          "Concepts: Adam optimizer, AdamW optimizer, weight decay in optimization, gradient coupling vs decoupled weight decay, moment updates in Adam, RMS scaling in Adam, gradient flow in optimization algorithms, regularization strength consistency.",
          "Summary: A detailed note and visualization were created comparing Adam and AdamW optimizers, highlighting the key difference in where weight decay is applied and its impact on regularization consistency and gradient flow.",
          "",
          "User request: explain AdamW like I am implementing it from scratch.",
        ].join("\n"),
      },
    ],
  },
];

const tools = {
  show_widget: tool({
    description: "Render a small HTML widget.",
    inputSchema: z.object({
      title: z.string(),
      html: z.string(),
    }),
    execute: async (input) => input,
  }),
  visualize_read_me: tool({
    description: "Create a visual explanation when useful.",
    inputSchema: z.object({
      topic: z.string(),
    }),
    execute: async (input) => ({ ok: true, topic: input.topic }),
  }),
};

const requestShapes = [
  {
    name: "plain-10k",
    maxOutputTokens: 10_000,
    tools: undefined,
  },
  {
    name: "tools-10k",
    maxOutputTokens: 10_000,
    tools,
  },
  {
    name: "tools-5k",
    maxOutputTokens: 5000,
    tools,
  },
  {
    name: "tools-2k",
    maxOutputTokens: 2000,
    tools,
  },
  {
    name: "real-tools-10k",
    maxOutputTokens: 10_000,
    tools: chatTools,
  },
];

function compactError(error: unknown) {
  const value = error as {
    name?: string;
    message?: string;
    reason?: string;
    statusCode?: number;
    url?: string;
    responseBody?: string;
    lastError?: unknown;
  };
  const lastError = value.lastError as
    | {
        name?: string;
        message?: string;
        statusCode?: number;
        url?: string;
        responseBody?: string;
      }
    | undefined;

  return {
    name: value.name,
    message: value.message,
    reason: value.reason,
    statusCode: value.statusCode,
    url: value.url,
    responseBody: value.responseBody,
    lastError: lastError
      ? {
          name: lastError.name,
          message: lastError.message,
          statusCode: lastError.statusCode,
          url: lastError.url,
          responseBody: lastError.responseBody,
        }
      : undefined,
  };
}

for (const promptCase of promptCases) {
  for (const shape of requestShapes) {
    const label = `${promptCase.name}:${shape.name}`;
    console.log(`\n=== ${label} ===`);
    try {
      const result = streamText({
        model: fireworks(modelId),
        system: APOLLO_PROMPT("Apollo", [
          {
            kind: "subject",
            freshness: "current",
            scope: {
              subject: "Computer Science",
              topic: "AdamW optimizer",
            },
            content:
              "The workspace subject is Computer Science. The current learning context covers Adam optimizer, AdamW optimizer, weight decay in optimization, gradient coupling vs decoupled weight decay, moment updates in Adam, RMS scaling in Adam, gradient flow in optimization algorithms, and regularization strength consistency.",
          },
          {
            kind: "session-summary",
            freshness: "recent",
            scope: {
              subject: "Computer Science",
              topic: "AdamW optimizer",
            },
            content:
              "A detailed note and visualization were created comparing Adam and AdamW optimizers, highlighting the key difference in where weight decay is applied (gradient coupling in Adam vs decoupled in AdamW) and its impact on regularization consistency and gradient flow.",
          },
        ]),
        messages: promptCase.messages,
        maxOutputTokens: shape.maxOutputTokens,
        stopWhen: stepCountIs(8),
        tools: shape.tools,
        onError: ({ error }) => {
          console.error("stream onError", JSON.stringify(compactError(error)));
        },
      });

      let text = "";
      for await (const chunk of result.textStream) {
        text += chunk;
      }
      console.log(
        JSON.stringify({
          ok: true,
          chars: text.length,
          preview: text.slice(0, 160),
        })
      );
    } catch (error) {
      console.error("caught", JSON.stringify(compactError(error)));
    }
  }
}
