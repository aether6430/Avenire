import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { userCanAccessWorkspace } from "@/lib/file-data";
import { DashboardLayout } from "@/components/dashboard/shell";
import { FileExplorer } from "@/components/files/explorer";
import { getFacehashUrl } from "@/lib/avatar";
import { listChatsForUser } from "@/lib/chat-data";

export default async function DashboardWorkspaceFolderPage({
  params,
}: {
  params: Promise<{ workspaceUuid: string; folderUuid: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const { workspaceUuid } = await params;
  const canAccess = await userCanAccessWorkspace(session.user.id, workspaceUuid);

  if (!canAccess) {
    redirect("/dashboard");
  }

  const chats = await listChatsForUser(session.user.id);

  return (
    <DashboardLayout
      activeChatSlug={chats[0]?.slug ?? ""}
      initialChats={chats}
      user={{
        name: session.user.name ?? "User",
        email: session.user.email,
        avatar: session.user.image ?? getFacehashUrl(session.user.name ?? session.user.email),
      }}
    >
      <FileExplorer />
    </DashboardLayout>
  );
}
