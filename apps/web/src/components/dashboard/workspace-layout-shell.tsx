"use client";

import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Suspense, useEffect } from "react";
import { DashboardLayout as DashboardShellLayout } from "@/components/dashboard/shell";
import {
  useWorkspaceBootstrap,
  WorkspaceBootstrapProvider,
} from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { AppQueryProvider } from "@/components/query-provider";

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
    <Suspense
      fallback={<WorkspaceRoutePlaceholder label="Loading workspace..." />}
    >
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
    </Suspense>
  );
}

export function WorkspaceLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="h-svh overflow-hidden bg-background text-foreground">
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange={false}
        enableSystem={false}
        storageKey="avenire-theme"
      >
        <AppQueryProvider>
          <WorkspaceBootstrapProvider>
            <WorkspaceLayoutFrame>{children}</WorkspaceLayoutFrame>
          </WorkspaceBootstrapProvider>
        </AppQueryProvider>
      </NextThemesProvider>
    </main>
  );
}
