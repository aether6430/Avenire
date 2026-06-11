const DEFAULT_NEW_CARDS_PER_DAY = 20;

function normalizeNonNegativeInteger(
  value: number | null | undefined,
  fallback: number
) {
  if (!(typeof value === "number" && Number.isFinite(value))) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export function applyNewCardDailyLimitToQueue<T>(input: {
  getNewCardsPerDay: (item: T) => number | null | undefined;
  getSetId: (item: T) => string;
  introducedNewTodayBySet?: ReadonlyMap<string, number>;
  isNew: (item: T) => boolean;
  items: readonly T[];
}): T[] {
  const selectedNewBySet = new Map<string, number>();
  const introducedNewTodayBySet =
    input.introducedNewTodayBySet ?? new Map<string, number>();
  const filtered: T[] = [];

  for (const item of input.items) {
    if (!input.isNew(item)) {
      filtered.push(item);
      continue;
    }

    const setId = input.getSetId(item);
    const limit = normalizeNonNegativeInteger(
      input.getNewCardsPerDay(item),
      DEFAULT_NEW_CARDS_PER_DAY
    );
    const introducedToday = normalizeNonNegativeInteger(
      introducedNewTodayBySet.get(setId),
      0
    );
    const selectedToday = selectedNewBySet.get(setId) ?? 0;
    const availableNewCards = Math.max(0, limit - introducedToday);

    if (selectedToday >= availableNewCards) {
      continue;
    }

    selectedNewBySet.set(setId, selectedToday + 1);
    filtered.push(item);
  }

  return filtered;
}
