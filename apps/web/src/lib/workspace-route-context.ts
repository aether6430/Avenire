import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveWorkspaceForUser } from "@/lib/file-data";

type RouteSession = Awaited<ReturnType<typeof auth.api.getSession>>;
type RouteWorkspace = Awaited<ReturnType<typeof resolveWorkspaceForUser>>;

function logRouteTiming(label: string, startTime: number) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  console.debug(`[perf] ${label}`, { durationMs });
}

export const getRouteSession = cache(async (): Promise<RouteSession> => {
  const startTime = performance.now();
  const session = await auth.api.getSession({ headers: await headers() });
  logRouteTiming("route-session", startTime);
  return session;
});

export const getWorkspaceRouteContext = cache(async () => {
  const startTime = performance.now();
  const session = await getRouteSession();

  if (!session?.user) {
    logRouteTiming("workspace-route-context", startTime);
    return {
      activeOrganizationId: null,
      session: null,
      workspace: null,
    };
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );

  logRouteTiming("workspace-route-context", startTime);
  return {
    activeOrganizationId,
    session,
    workspace,
  };
});

export async function requireRouteSession() {
  const session = await getRouteSession();
  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireWorkspaceRouteContext(
  missingWorkspaceRedirect: Route = "/workspace" as Route
): Promise<{
  activeOrganizationId: string | null;
  session: NonNullable<RouteSession>;
  workspace: NonNullable<RouteWorkspace>;
}> {
  const context = await getWorkspaceRouteContext();

  if (!context.session?.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect(missingWorkspaceRedirect);
  }

  return {
    activeOrganizationId: context.activeOrganizationId,
    session: context.session,
    workspace: context.workspace,
  };
}
