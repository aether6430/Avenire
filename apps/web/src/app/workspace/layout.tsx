import { extractRouterConfig } from "@avenire/storage";
import { StorageSSRPlugin } from "@avenire/storage/ssr";
import { WorkspaceLayoutShell } from "@/components/dashboard/workspace-layout-shell";
import { WorkspaceLayoutClientEffects } from "@/components/pwa/workspace-layout-client-effects";
import { router as uploadRouter } from "@/lib/upload";
import { requireRouteSession } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

const uploadRouterConfig = extractRouterConfig(uploadRouter);

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRouteSession();

  return (
    <>
      <StorageSSRPlugin routerConfig={uploadRouterConfig} />
      <WorkspaceLayoutClientEffects />
      <WorkspaceLayoutShell>{children}</WorkspaceLayoutShell>
    </>
  );
}
