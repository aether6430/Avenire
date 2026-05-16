"use client";

import type { WorkspaceSummary } from "@/components/dashboard/command-palette-model";
import { CommandPaletteSurface } from "@/components/dashboard/command-palette-surface";
import { useCommandPalette } from "@/components/dashboard/use-command-palette";

export function CommandPalette({
  workspaceUuid,
  workspaces = [],
}: {
  workspaceUuid?: string;
  workspaces?: WorkspaceSummary[];
}) {
  const runtime = useCommandPalette({
    workspaceUuid,
    workspaces,
  });

  return <CommandPaletteSurface runtime={runtime} />;
}
