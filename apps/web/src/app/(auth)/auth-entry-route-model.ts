export function readSingleAuthSearchParam(
  value: string | string[] | undefined
) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return null;
}

export function resolveAuthEntryCallbackURL(input: {
  fallback: string;
  value: string | string[] | undefined;
}) {
  const raw = readSingleAuthSearchParam(input.value)?.trim();

  if (!raw?.startsWith("/") || raw.startsWith("//")) {
    return input.fallback;
  }

  if (
    raw === "/login" ||
    raw.startsWith("/login?") ||
    raw === "/register" ||
    raw.startsWith("/register?")
  ) {
    return input.fallback;
  }

  return raw;
}
