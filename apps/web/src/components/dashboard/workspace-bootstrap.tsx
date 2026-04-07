"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  readCachedWorkspaces,
  writeCachedWorkspaces,
} from "@/lib/dashboard-browser-cache";
import { useUserStore } from "@/stores/userStore";

export interface WorkspaceBootstrapUser {
  email: string;
  id: string;
  image: string | null;
  name: string | null;
}

export interface WorkspaceBootstrapWorkspace {
  logo: string | null;
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

interface WorkspaceBootstrapPayload {
  user: WorkspaceBootstrapUser | null;
  workspace: WorkspaceBootstrapWorkspace | null;
  workspaces: WorkspaceBootstrapWorkspace[];
}

interface WorkspaceBootstrapContextValue {
  error: Error | null;
  refresh: () => Promise<unknown>;
  status: "error" | "loading" | "ready" | "unauthorized";
  user: WorkspaceBootstrapUser | null;
  workspace: WorkspaceBootstrapWorkspace | null;
  workspaces: WorkspaceBootstrapWorkspace[];
}

const WorkspaceBootstrapContext =
  createContext<WorkspaceBootstrapContextValue | null>(null);

async function loadWorkspaceBootstrap(
  signal?: AbortSignal
): Promise<WorkspaceBootstrapPayload | null> {
  const response = await fetch("/api/workspace/bootstrap", {
    cache: "no-store",
    signal,
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load workspace.");
  }

  return (await response.json()) as WorkspaceBootstrapPayload;
}

export function WorkspaceBootstrapProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const cachedWorkspaces = useMemo(
    () =>
      (readCachedWorkspaces() ?? []).map((workspace) => ({
        ...workspace,
        logo: null,
      })),
    []
  );
  const query = useQuery({
    queryFn: ({ signal }) => loadWorkspaceBootstrap(signal),
    queryKey: ["workspace-bootstrap"],
    staleTime: 30_000,
  });

  const routeWorkspaceUuid = useMemo(() => {
    const match = pathname.match(/^\/workspace\/files\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const workspaces = query.data?.workspaces ?? cachedWorkspaces;
  const resolvedWorkspace = useMemo(() => {
    if (routeWorkspaceUuid) {
      const routedWorkspace =
        workspaces.find(
          (candidate) => candidate.workspaceId === routeWorkspaceUuid
        ) ?? null;
      if (routedWorkspace) {
        return routedWorkspace;
      }
    }

    if (!query.data?.workspace) {
      return workspaces[0] ?? null;
    }

    const activeWorkspace = query.data.workspace;
    const summary =
      workspaces.find(
        (candidate) => candidate.workspaceId === activeWorkspace.workspaceId
      ) ?? null;

    return summary ?? activeWorkspace;
  }, [query.data?.workspace, routeWorkspaceUuid, workspaces]);

  useEffect(() => {
    if (query.data?.user) {
      setUser(query.data.user);
      return;
    }

    if (query.data === null) {
      clearUser();
    }
  }, [clearUser, query.data, setUser]);

  useEffect(() => {
    if (workspaces.length === 0) {
      return;
    }

    writeCachedWorkspaces(workspaces);
  }, [workspaces]);

  const value = useMemo<WorkspaceBootstrapContextValue>(() => {
    const status = query.isPending
      ? "loading"
      : query.data === null
        ? "unauthorized"
        : query.isError
          ? "error"
          : "ready";

    return {
      error: query.error ?? null,
      refresh: query.refetch,
      status,
      user: query.data?.user ?? null,
      workspace: resolvedWorkspace,
      workspaces,
    };
  }, [query.data, query.error, query.isError, query.isPending, query.refetch, resolvedWorkspace, workspaces]);

  return (
    <WorkspaceBootstrapContext.Provider value={value}>
      {children}
    </WorkspaceBootstrapContext.Provider>
  );
}

export function useWorkspaceBootstrap() {
  const context = useContext(WorkspaceBootstrapContext);

  if (!context) {
    throw new Error(
      "useWorkspaceBootstrap must be used inside WorkspaceBootstrapProvider"
    );
  }

  return context;
}
