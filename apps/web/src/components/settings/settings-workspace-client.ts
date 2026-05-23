"use client";

import type {
  WorkspaceMember,
  WorkspaceSummary,
  WorkspaceUsage,
} from "@/components/settings/settings-panel-model";

function getWorkspaceError(
  payload: { error?: string } | null | undefined,
  fallback: string
) {
  return payload?.error ?? fallback;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T;
}

export async function loadWorkspaceMembers(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/share/members`, {
    cache: "no-store",
  });
  const payload = await parseJson<{
    error?: string;
    members?: WorkspaceMember[];
  }>(response);

  if (!response.ok) {
    throw new Error(
      getWorkspaceError(payload, "Unable to load workspace members.")
    );
  }

  return payload.members ?? [];
}

export async function loadWorkspaceUsage(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/usage`, {
    cache: "no-store",
  });
  const payload = await parseJson<{
    error?: string;
    usage?: WorkspaceUsage;
  }>(response);

  if (!response.ok) {
    throw new Error(
      getWorkspaceError(payload, "Unable to load workspace stats.")
    );
  }

  return payload.usage ?? null;
}

export async function loadWorkspacesList() {
  const response = await fetch("/api/workspaces/list", { cache: "no-store" });
  const payload = await parseJson<{
    error?: string;
    workspaces?: WorkspaceSummary[];
  }>(response);

  if (!response.ok) {
    throw new Error(getWorkspaceError(payload, "Unable to load workspaces."));
  }

  return payload.workspaces ?? [];
}

export async function updateWorkspaceLogo({
  logo,
  workspaceId,
}: {
  logo: string | null;
  workspaceId: string;
}) {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    body: JSON.stringify({ logo }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = await parseJson<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(
      getWorkspaceError(payload, "Unable to update workspace icon.")
    );
  }
}

export async function createWorkspaceByName(name: string) {
  const response = await fetch("/api/workspaces", {
    body: JSON.stringify({ name }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await parseJson<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(getWorkspaceError(payload, "Unable to create workspace."));
  }
}

export async function inviteWorkspaceMemberByEmail({
  email,
  workspaceId,
}: {
  email: string;
  workspaceId: string;
}) {
  const response = await fetch(`/api/workspaces/${workspaceId}/share/members`, {
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await parseJson<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(getWorkspaceError(payload, "Unable to add member."));
  }
}

export async function removeWorkspaceMemberById({
  memberIdOrEmail,
  workspaceId,
}: {
  memberIdOrEmail: string;
  workspaceId: string;
}) {
  const response = await fetch(`/api/workspaces/${workspaceId}/share/members`, {
    body: JSON.stringify({ memberIdOrEmail }),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
  const payload = await parseJson<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(getWorkspaceError(payload, "Unable to remove member."));
  }
}

export async function deleteWorkspaceById(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
  const payload = await parseJson<{
    error?: string;
    workspaces?: WorkspaceSummary[];
  }>(response);
  const errorMessage = getWorkspaceError(
    payload,
    "Unable to delete workspace."
  );

  if (
    response.status === 403 &&
    errorMessage === "Sudo verification required"
  ) {
    return {
      status: "sudo_required" as const,
      error: errorMessage,
    };
  }

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return {
    status: "deleted" as const,
    workspaces: payload.workspaces ?? [],
  };
}
