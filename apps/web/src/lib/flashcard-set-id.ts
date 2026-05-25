const FLASHCARD_SET_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeFlashcardSetId(value: string) {
  const trimmed = value.trim();
  return FLASHCARD_SET_ID_PATTERN.test(trimmed) ? trimmed : null;
}
