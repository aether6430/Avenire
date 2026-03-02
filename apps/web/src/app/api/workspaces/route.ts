import { NextResponse } from "next/server";
import { auth } from "@avenire/auth/server";
import { randomUUID } from "node:crypto";
import { getWorkspaceContextForUser, getSessionUser } from "@/lib/workspace";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { headers } from "next/headers";

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    workspaceUuid: ctx.workspace.workspaceId,
    organizationId: ctx.workspace.organizationId,
    rootFolderUuid: ctx.workspace.rootFolderId,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const trimmed = body.name?.trim().slice(0, 80) || "New Workspace";
  const slugBase =
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "workspace";
  const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;

  const org = await auth.api.createOrganization({
    body: {
      name: trimmed,
      slug,
      keepCurrentActiveOrganization: false,
      userId: user.id,
    },
    headers: await headers(),
  });

  if (!org?.id) {
    return NextResponse.json({ error: "Unable to create workspace" }, { status: 400 });
  }

  const workspace = await resolveWorkspaceForUser(user.id, org.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unable to resolve workspace" }, { status: 500 });
  }

  return NextResponse.json(
    {
      workspace: {
        ...workspace,
        name: trimmed,
      },
    },
    { status: 201 },
  );
}
