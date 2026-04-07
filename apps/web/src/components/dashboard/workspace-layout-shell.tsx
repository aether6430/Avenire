"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout as DashboardShellLayout } from "@/components/dashboard/shell";
import { WorkspaceBootstrapProvider, useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { AppQueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

function WorkspaceLayoutFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status, user, workspace, workspaces } = useWorkspaceBootstrap();

  useEffect(() => {
    if (status === "unauthorized") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "unauthorized") {
    return <WorkspaceRoutePlaceholder label="Redirecting to login..." />;
  }

  return (
    <DashboardShellLayout
      activeWorkspace={workspace}
      initialWorkspaces={workspaces}
      user={
        user
          ? {
              avatar: user.image ?? undefined,
              email: user.email,
              id: user.id,
              name: user.name ?? user.email,
            }
          : undefined
      }
    >
      {children}
    </DashboardShellLayout>
  );
}

export function WorkspaceLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <main className="h-svh overflow-hidden bg-background text-foreground">
        <AppQueryProvider>
          <WorkspaceBootstrapProvider>
            <WorkspaceLayoutFrame>{children}</WorkspaceLayoutFrame>
          </WorkspaceBootstrapProvider>
        </AppQueryProvider>
      </main>
    </ThemeProvider>
  );
}
