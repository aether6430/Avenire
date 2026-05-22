import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { listFlashcardDueCountsByDayForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (!(from && to)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.flashcards,
    workspace.workspaceId
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.flashcards,
    params: {
      from: from.toISOString().slice(0, 10),
      route: "revision-calendar",
      to: to.toISOString().slice(0, 10),
    },
    scope: workspace.workspaceId,
    version,
  });
  const cached = await getCachedRoute<{ data: Record<string, unknown[]> }>(
    cacheKey
  );
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-flashcards-cache": "hit" },
    });
  }

  const rows = await listFlashcardDueCountsByDayForUser(
    session.user.id,
    workspace.workspaceId,
    from,
    to
  );

  const data: Record<
    string,
    Array<{ id: string; setId: string; title: string; dueCount: number }>
  > = {};

  for (const row of rows) {
    if (!data[row.day]) {
      data[row.day] = [];
    }
    data[row.day].push({
      id: `${row.setId}-${row.day}`,
      setId: row.setId,
      title: row.setTitle,
      dueCount: row.dueCount,
    });
  }

  const payload = { data };
  await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-flashcards-cache": "miss" },
  });
}
