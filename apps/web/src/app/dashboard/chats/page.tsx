import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { resolveWorkspaceForUser } from "@/lib/file-data";

export default async function DashboardChatsIndexPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );
  if (!workspace) {
    redirect("/workspace" as Route);
  }

  return (
    <ChatWorkspace
      chatSlug="new"
      chatTitle="New Chat"
      initialMessages={[]}
      initialPrompt={null}
      isReadonly={false}
      userName={session.user.name ?? undefined}
      workspaceUuid={workspace.workspaceId}
    />
  );
}
