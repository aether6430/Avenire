import {
  APOLLO_LANGUAGE_MODEL_IDS,
  type ApolloModelName,
  apollo,
  generateText,
} from "@avenire/ai";
import {
  CHAT_ICON_NAMES,
  DEFAULT_CHAT_ICON,
  isChatIconName,
} from "@/lib/chat-icons";
import { isAbortLikeError, logError, logInfo } from "./chat-route-logging";
import {
  DEFAULT_THINKING_MESSAGES,
  fallbackChatNameFromText,
  sanitizeChatName,
} from "./chat-route-model";

const DEFAULT_CHAT_TITLE_MODEL: ApolloModelName = "apollo-meta";

export function resolveChatTitleModel(): ApolloModelName {
  const raw = process.env.CHAT_TITLE_MODEL?.trim();
  if (!raw) {
    return DEFAULT_CHAT_TITLE_MODEL;
  }

  const allowed = new Set<ApolloModelName>([
    "apollo-sprint",
    "apollo-core",
    "apollo-apex",
    "apex-turbo",
    "apollo-agent",
    "apollo-meta",
    "apollo-tiny",
  ]);

  if (allowed.has(raw as ApolloModelName)) {
    if (
      (raw === "apollo-sprint" || raw === "apollo-tiny") &&
      !process.env.MISTRAL_API_KEY?.trim()
    ) {
      return DEFAULT_CHAT_TITLE_MODEL;
    }
    return raw as ApolloModelName;
  }

  return DEFAULT_CHAT_TITLE_MODEL;
}

export async function generateChatMetadata(
  latestUserText: string,
  abortSignal?: AbortSignal
) {
  const trimmedLatestUserText = latestUserText.trim();
  if (!trimmedLatestUserText) {
    logInfo("Skipping chat title generation: latest user text missing");
    return null;
  }

  try {
    const modelName = resolveChatTitleModel();
    logInfo("Generating chat title", {
      model: apollo.languageModel(modelName),
      providerModel: APOLLO_LANGUAGE_MODEL_IDS[modelName],
      sourceLength: trimmedLatestUserText.length,
    });

    const { text } = await generateText({
      model: apollo.languageModel(modelName),
      prompt: [
        "Generate a concise, descriptive chat title and a single icon choice based only on the user's request.",
        "Use 4-8 words when possible.",
        "Avoid generic labels and single-word replies.",
        "No quotes. No punctuation at the end.",
        "Pick ONE icon from this list (exact string match):",
        CHAT_ICON_NAMES.join(", "),
        "Return ONLY valid JSON with this shape:",
        '{"title":"...","icon":"..."}',
        `User message: ${trimmedLatestUserText}`,
      ].join("\n"),
      maxOutputTokens: 64,
      temperature: 0.2,
      abortSignal,
    });

    if (!text || text.trim().length === 0) {
      const fallback = fallbackChatNameFromText(latestUserText);
      logInfo("Generated chat title result", {
        raw: text ?? "",
        normalized: "",
        accepted: false,
        fallback,
      });
      return { title: fallback, icon: DEFAULT_CHAT_ICON };
    }

    let parsedTitle: string | null = null;
    let parsedIcon: string | null = null;
    const trimmed = text.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const candidate = trimmed.slice(jsonStart, jsonEnd + 1);
      try {
        const parsed = JSON.parse(candidate) as {
          title?: string;
          icon?: string;
        };
        parsedTitle = typeof parsed.title === "string" ? parsed.title : null;
        parsedIcon = typeof parsed.icon === "string" ? parsed.icon : null;
      } catch {
        parsedTitle = null;
        parsedIcon = null;
      }
    }

    const normalized = parsedTitle ? sanitizeChatName(parsedTitle) : "";
    const fallback = fallbackChatNameFromText(trimmedLatestUserText);
    const accepted =
      normalized.length > 0 &&
      (normalized.length >= 8 ||
        trimmedLatestUserText.length <= normalized.length + 4);
    logInfo("Generated chat title result", {
      raw: text,
      normalized,
      accepted,
      fallback,
    });

    if (accepted) {
      const icon = isChatIconName(parsedIcon) ? parsedIcon : DEFAULT_CHAT_ICON;
      return { title: normalized, icon };
    }

    return { title: fallback, icon: DEFAULT_CHAT_ICON };
  } catch (error) {
    if (abortSignal?.aborted || isAbortLikeError(error)) {
      return null;
    }
    logError("Failed to generate chat title", { error });
    return {
      title: fallbackChatNameFromText(trimmedLatestUserText),
      icon: DEFAULT_CHAT_ICON,
    };
  }
}

export async function generateChatThinkingMessages(
  latestUserText: string,
  abortSignal?: AbortSignal
) {
  if (!(latestUserText && !abortSignal?.aborted)) {
    return null;
  }

  return DEFAULT_THINKING_MESSAGES;
}
