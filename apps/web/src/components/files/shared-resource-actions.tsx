"use client";

import { Button } from "@avenire/ui/components/button";
import { Copy, Spinner } from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkspaceOption = {
  name: string;
  rootFolderId: string;
  workspaceId: string;
};

export function SharedResourceActions({
  token,
  workspaces,
  resourceLabel,
}: {
  token: string;
  workspaces: WorkspaceOption[];
  resourceLabel: "file" | "folder";
}) {
  const router = useRouter();
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(
    workspaces[0]?.workspaceId ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const copyIntoWorkspace = async () => {
    if (!targetWorkspaceId || busy) {
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/share/${token}/duplicate`, {
        body: JSON.stringify({ workspaceId: targetWorkspaceId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        route?: string;
      };

      if (!response.ok || !payload.route) {
        setStatus(payload.error ?? `Unable to copy this ${resourceLabel}.`);
        return;
      }

      router.push(payload.route as Route);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border bg-card p-4 text-left">
      <p className="font-medium text-sm">Copy to my workspace</p>
      <p className="mt-1 text-muted-foreground text-xs">
        Duplicate this {resourceLabel} into one of your own workspaces.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          onChange={(event) => setTargetWorkspaceId(event.target.value)}
          value={targetWorkspaceId}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.workspaceId} value={workspace.workspaceId}>
              {workspace.name}
            </option>
          ))}
        </select>
        <Button
          disabled={busy || !targetWorkspaceId}
          onClick={copyIntoWorkspace}
          type="button"
        >
          {busy ? <Spinner className="size-4" /> : <Copy className="size-4" />}
          Copy
        </Button>
      </div>
      {status ? (
        <p className="mt-2 text-muted-foreground text-xs">{status}</p>
      ) : null}
    </div>
  );
}
