import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout as DashboardShellLayout } from "@/components/dashboard/shell";
import { getFacehashUrl } from "@/lib/avatar";
import { listChatsForUser } from "@/lib/chat-data";
import { listWorkspacesForUser, resolveWorkspaceForUser } from "@/lib/file-data";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;

  const activeWorkspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );
  const fallbackWorkspace = activeWorkspace
    ? null
    : (await listWorkspacesForUser(session.user.id))[0] ?? null;
  const workspaceId = activeWorkspace?.workspaceId ?? fallbackWorkspace?.workspaceId ?? null;

  const chats = workspaceId ? await listChatsForUser(session.user.id, workspaceId) : [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardShellLayout
        initialChats={chats}
        user={{
          name: session.user.name ?? "User",
          email: session.user.email,
          avatar:
            session.user.image ??
            getFacehashUrl(session.user.name ?? session.user.email),
        }}
      >
        {children}
      </DashboardShellLayout>
    </main>
  );
}
