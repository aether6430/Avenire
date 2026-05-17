import type { ExploreItem } from "@/components/chat/rolling-tool-activity-types";

export const ROW_HEIGHT = 22;
export const VISIBLE_ROWS = 3;
export const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

export function buildOccurrenceKeys<T>(
  items: readonly T[],
  toBaseKey: (item: T) => string
) {
  const seenKeys = new Map<string, number>();
  return items.map((item) => {
    const baseKey = toBaseKey(item);
    const occurrence = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
  });
}

export function getExploreItemSignature(items: ExploreItem[]) {
  return items.map((item) => `${item.label}\u0000${item.value}`).join("\u0001");
}
