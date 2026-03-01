import { createResourceShareLink, resolveWorkspaceForUser } from "@/lib/file-data";
import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getChatBySlugForUser } from "@/lib/chat-data";

export async function POST(
  _request: Request,
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

  const link = await createResourceShareLink({
    workspaceId: ws.workspaceId,
    resourceType: "chat",
    resourceId: chat.slug,
    createdBy: session.user.id,
    expiresInDays: 7,
    allowPublic: true,
  });

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return NextResponse.json({
    link,
    shareUrl: `${baseUrl}/share/${link.token}`,
  });
}
