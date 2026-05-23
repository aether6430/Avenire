import { CACHE_NAMESPACES } from "@/lib/domain-cache";

function parseRevisionCalendarDate(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const [, year, month, day] = match;
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
}

export const FLASHCARDS_REVISION_CALENDAR_LOAD_ERROR =
  "Unable to load revision calendar.";

export function buildFlashcardsRevisionCalendarCacheKeyInput(input: {
  from: Date;
  to: Date;
  version: string;
  workspaceId: string;
}) {
  return {
    namespace: CACHE_NAMESPACES.flashcards,
    params: {
      from: input.from.toISOString().slice(0, 10),
      route: "revision-calendar",
      to: input.to.toISOString().slice(0, 10),
    },
    scope: input.workspaceId,
    version: input.version,
  };
}

export function resolveFlashcardsRevisionCalendarActiveOrganizationId(session: {
  session?: { activeOrganizationId?: string | null };
}) {
  return session.session?.activeOrganizationId ?? null;
}

export function parseFlashcardsRevisionCalendarRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseRevisionCalendarDate(searchParams.get("from"));
  const to = parseRevisionCalendarDate(searchParams.get("to"));

  if (!(from && to) || from.getTime() > to.getTime()) {
    return null;
  }

  return {
    from,
    to,
  };
}

export function buildFlashcardsRevisionCalendarResponse(input: {
  rows: Array<{
    day: string;
    dueCount: number;
    setId: string;
    setTitle: string;
  }>;
}) {
  const data: Record<
    string,
    Array<{ id: string; setId: string; title: string; dueCount: number }>
  > = {};

  for (const row of input.rows) {
    if (!data[row.day]) {
      data[row.day] = [];
    }

    data[row.day].push({
      dueCount: row.dueCount,
      id: `${row.setId}-${row.day}`,
      setId: row.setId,
      title: row.setTitle,
    });
  }

  return { data };
}

export function resolveFlashcardsRevisionCalendarRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
