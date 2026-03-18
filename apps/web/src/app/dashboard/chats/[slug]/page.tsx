import type { Metadata } from "next";
import type { UIMessage } from "@avenire/ai/message-types";
import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import {
  getChatBySlugForUser,
  getMessagesByChatSlugForUser,
} from "@/lib/chat-data";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return buildPageMetadata({ title: "Chat" });
  }

  const { slug } = await params;
  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(session.user.id, activeOrganizationId);
  if (!workspace) {
    return buildPageMetadata({ title: "Chat" });
  }
  if (slug === "new") {
    return buildPageMetadata({ title: "New Chat" });
  }
  const chat = await getChatBySlugForUser(session.user.id, slug, workspace.workspaceId);

  return buildPageMetadata({
    title: chat?.title?.trim() || "Chat",
  });
}

export default async function DashboardChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(session.user.id, activeOrganizationId);
  if (!workspace) {
    redirect("/dashboard");
  }

  if (slug === "new") {
    return (
      <ChatWorkspace
        chatSlug="new"
        chatTitle="New Chat"
        chatIcon={null}
        initialMessages={[]}
        isReadonly={false}
        userName={session.user.name ?? undefined}
        workspaceUuid={workspace.workspaceId}
      />
    );
  }

  const [chat, initialMessages] = await Promise.all([
    getChatBySlugForUser(session.user.id, slug, workspace.workspaceId),
    getMessagesByChatSlugForUser(session.user.id, slug, workspace.workspaceId),
  ]);

  if (!chat) {
    redirect("/dashboard");
  }

  return (
    <ChatWorkspace
      chatSlug={chat.slug}
      chatTitle={chat.title}
      chatIcon={chat.icon ?? null}
      initialMessages={(initialMessages ?? []) as UIMessage[]}
      isReadonly={Boolean(chat.readOnly)}
      userName={session.user.name ?? undefined}
      workspaceUuid={workspace.workspaceId}
    />
  );
}
