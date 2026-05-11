import { createFireworks } from "@ai-sdk/fireworks";
import { streamText, stepCountIs, tool } from "ai";
import { APOLLO_PROMPT } from "../prompts";
import { chatTools, legacyShowWidgetInputSchema } from "../tools";

const modelId = "accounts/fireworks/models/kimi-k2p5";
const fireworks = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY,
});

const toolEntries = Object.entries(chatTools);
const legacyToolEntries = toolEntries.map(([name, value]) => {
  if (name !== "show_widget") {
    return [name, value] as const;
  }

  return [
    name,
    tool({
      description:
        "Render an interactive HTML/CSS/JS widget in the chat. Use for visualizations, diagrams, charts, simulations, and interactive explainers.",
      inputSchema: legacyShowWidgetInputSchema,
    }),
  ] as const;
});
const toolNames = toolEntries.map(([name]) => name);
const groups: Record<string, string[]> = {
  all: toolNames,
  all_legacy_show_widget: toolNames,
  no_visual: toolNames.filter(
    (name) => !["visualize_read_me", "show_widget"].includes(name)
  ),
  agents: ["avenire_agent", "file_manager_agent", "note_agent"],
  study: [
    "generate_flashcards",
    "generate_flashcards_from_misconception",
    "get_due_cards",
    "quiz_me",
    "load_skill",
  ],
  misconceptions: [
    "log_misconception",
    "list_misconceptions",
    "resolve_misconception",
    "clear_misconception",
    "improve_misconception",
  ],
  visual: ["visualize_read_me", "show_widget"],
  retrieval: ["web_search", "search_materials"],
};

function selectTools(names: string[], legacyShowWidget = false) {
  const entries = legacyShowWidget ? legacyToolEntries : toolEntries;
  return Object.fromEntries(
    entries.filter(([name]) => names.includes(name))
  ) as typeof chatTools;
}

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

async function probe(label: string, names: string[]) {
  console.log(`\n=== ${label} (${names.join(",") || "none"}) ===`);
  let streamFailed = false;
  const result = streamText({
    model: fireworks(modelId),
    system: APOLLO_PROMPT("Apollo", undefined, {
      useWidgetSpec: label.includes("legacy_show_widget") ? false : true,
    }),
    messages: [
      {
        role: "user",
        content: "In one sentence, say hello.",
      },
    ],
    tools: selectTools(names, label.includes("legacy_show_widget")),
    maxOutputTokens: 1000,
    maxRetries: 0,
    stopWhen: stepCountIs(8),
    onError: ({ error }) => {
      streamFailed = true;
      console.error("stream onError", JSON.stringify(compactError(error)));
    },
  });

  let text = "";
  for await (const chunk of result.textStream) {
    text += chunk;
  }
  console.log(JSON.stringify({ ok: !streamFailed, chars: text.length }));
}

for (const [label, names] of Object.entries(groups)) {
  await probe(label, names);
}

for (const name of toolNames) {
  await probe(`single:${name}`, [name]);
}
