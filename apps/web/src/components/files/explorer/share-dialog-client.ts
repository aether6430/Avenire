"use client";

export interface ShareDialogWorkspaceMember {
  avatar?: string | null;
  email: string | null;
  name: string | null;
  role: string;
  userId: string | null;
}

async function parseShareDialogError(
  response: Response,
  fallbackMessage: string
) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  return payload.error ?? fallbackMessage;
}

export async function grantFileShareAccess(options: {
  email: string;
  fileId: string;
  permission: "viewer" | "editor";
  workspaceUuid: string;
}) {
  const { email, fileId, permission, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/files/${fileId}/share/grants`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        permission,
      }),
    }
  );

  if (!response.ok) {
    return {
      error: await parseShareDialogError(
        response,
        "Unable to grant file access."
      ),
      ok: false as const,
    };
  }

  return { ok: true as const };
}

export async function createFileShareLink(options: {
  fileId: string;
  workspaceUuid: string;
}) {
  const { fileId, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/files/${fileId}/share/link`,
    { method: "POST" }
  );

  if (!response.ok) {
    return {
      error: await parseShareDialogError(
        response,
        "Unable to generate file link."
      ),
      ok: false as const,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    shareUrl?: string;
  };

  if (!payload.shareUrl) {
    return {
      error: "Unable to generate file link.",
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    shareUrl: payload.shareUrl,
  };
}

export async function grantFolderShareAccess(options: {
  email: string;
  folderId: string;
  permission: "viewer" | "editor";
  workspaceUuid: string;
}) {
  const { email, folderId, permission, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/folders/${folderId}/share/grants`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        permission,
      }),
    }
  );

  if (!response.ok) {
    return {
      error: await parseShareDialogError(
        response,
        "Unable to grant folder access."
      ),
      ok: false as const,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    shareUrl?: string;
  };

  return {
    ok: true as const,
    shareUrl: payload.shareUrl ?? null,
  };
}

export async function createFolderShareLink(options: {
  folderId: string;
  workspaceUuid: string;
}) {
  const { folderId, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/folders/${folderId}/share/link`,
    { method: "POST" }
  );

  if (!response.ok) {
    return {
      error: await parseShareDialogError(
        response,
        "Unable to generate folder link."
      ),
      ok: false as const,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    shareUrl?: string;
  };

  if (!payload.shareUrl) {
    return {
      error: "Unable to generate folder link.",
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    shareUrl: payload.shareUrl,
  };
}

export async function shareWorkspaceMemberAccess(options: {
  email: string;
  role: "admin" | "member";
  workspaceUuid: string;
}) {
  const { email, role, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/share/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role,
      }),
    }
  );

  if (!response.ok) {
    return {
      error: await parseShareDialogError(
        response,
        "Unable to share workspace access."
      ),
      ok: false as const,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
  };

  return {
    ok: true as const,
    status: payload.status ?? null,
  };
}

export async function loadWorkspaceShareMembers(options: {
  workspaceUuid: string;
}) {
  const { workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/share/members`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    members?: ShareDialogWorkspaceMember[];
  };

  return payload.members ?? [];
}

export async function notifyWorkspaceShareTeam(options: {
  workspaceUuid: string;
}) {
  const { workspaceUuid } = options;
  const response = await fetch(`/api/workspaces/${workspaceUuid}/share/team`, {
    method: "POST",
  });

  if (!response.ok) {
    return {
      error: await parseShareDialogError(
        response,
        "Unable to notify workspace team."
      ),
      ok: false as const,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    emailSentCount?: number;
    queued?: boolean;
    recipients?: number;
  };

  return {
    emailSentCount: payload.emailSentCount ?? 0,
    ok: true as const,
    queued: Boolean(payload.queued),
    recipients: payload.recipients ?? 0,
  };
}
