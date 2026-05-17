"use client";

import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  normalizePropertyDefinitions,
  type WorkspacePropertyDefinition,
} from "@/lib/frontmatter";

export { loadWorkspaceTreePayload } from "@/lib/workspace-tree-client";

interface WorkspaceFolderPayload {
  ancestors: FolderRecord[];
  files: FileRecord[];
  folders: FolderRecord[];
}

const inFlightFolderLoads = new Map<
  string,
  Promise<WorkspaceFolderPayload | null>
>();
const inFlightPropertyLoads = new Map<
  string,
  Promise<WorkspacePropertyDefinition[]>
>();

function withInFlightDeduplication<T>(
  store: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>
) {
  const existing = store.get(key);
  if (existing) {
    return existing;
  }

  const next = load().finally(() => {
    store.delete(key);
  });
  store.set(key, next);
  return next;
}

export async function loadWorkspaceFolderPayload(
  workspaceUuid: string,
  folderId: string
) {
  return withInFlightDeduplication(
    inFlightFolderLoads,
    `${workspaceUuid}:${folderId}`,
    async () => {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/folders/${folderId}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return null;
      }

      const payload =
        (await response.json()) as Partial<WorkspaceFolderPayload>;
      return {
        ancestors: payload.ancestors ?? [],
        files: payload.files ?? [],
        folders: payload.folders ?? [],
      };
    }
  );
}

export async function loadWorkspacePropertyDefinitionsPayload(
  workspaceUuid: string
) {
  return withInFlightDeduplication(
    inFlightPropertyLoads,
    workspaceUuid,
    async () => {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/property-registry`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as { properties?: unknown };
      return normalizePropertyDefinitions(payload.properties);
    }
  );
}
