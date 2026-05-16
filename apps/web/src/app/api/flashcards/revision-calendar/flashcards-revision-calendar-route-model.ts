function parseRevisionCalendarDate(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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
