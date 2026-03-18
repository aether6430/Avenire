import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listFlashcardDueCountsByDayForUser } from "@/lib/flashcards";
import { resolveWorkspaceForUser } from "@/lib/file-data";

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

  if (!from || !to) {
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

  return NextResponse.json({ data });
}
