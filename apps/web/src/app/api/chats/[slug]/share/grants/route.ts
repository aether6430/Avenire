import { grantResourceToUserByEmail, resolveWorkspaceForUser } from "@/lib/file-data";
import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getChatBySlugForUser } from "@/lib/chat-data";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const chat = await getChatBySlugForUser(session.user.id, slug);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const ws = await resolveWorkspaceForUser(session.user.id, activeOrganizationId);
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  if (!body.email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const grant = await grantResourceToUserByEmail({
    workspaceId: ws.workspaceId,
    resourceType: "chat",
    resourceId: chat.slug,
    email: body.email,
    createdBy: session.user.id,
    permission: "read",
  });

  if (!grant) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ grant }, { status: 201 });
}
