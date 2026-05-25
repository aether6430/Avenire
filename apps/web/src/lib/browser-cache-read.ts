export function readBrowserCache<T>(
  key: string,
  validate: (value: unknown) => value is T
): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
