function deserializeStoredStringLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith('"') ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return null;
    }
  }

  return value;
}

export function serializeChatInputDraft(value: string) {
  return value;
}

export function deserializeChatInputDraft(value: string) {
  return deserializeStoredStringLike(value) ?? "";
}
