"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { DashboardLayoutProps } from "@/components/dashboard/shell";
import {
  useWorkspaceBootstrap,
  WorkspaceBootstrapProvider,
} from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { AppQueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

const DashboardShellLayout = dynamic<DashboardLayoutProps>(
  () =>
    import("@/components/dashboard/shell").then(
      (module) => module.DashboardLayout
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading workspace..." />,
    ssr: false,
  }
);

function WorkspaceLayoutFrame({ children }: { children: React.ReactNode }) {
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
    <main className="h-svh overflow-hidden bg-background text-foreground">
      <ThemeProvider>
        <AppQueryProvider>
          <WorkspaceBootstrapProvider>
            <WorkspaceLayoutFrame>{children}</WorkspaceLayoutFrame>
          </WorkspaceBootstrapProvider>
        </AppQueryProvider>
      </ThemeProvider>
    </main>
  );
}
