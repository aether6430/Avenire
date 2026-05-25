"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applySidebarFilesRealtimeInvalidation,
  buildSidebarAutoExpandedAncestorIds,
  buildSidebarRootExpandedIds,
  createFilesRealtimeConnection,
  resolveSidebarRootFolderId,
  type SidebarFileNode,
  type SidebarFolderNode,
} from "@/components/dashboard/sidebar-files-panel-model";
import { invalidateWorkspaceFolderCache } from "@/lib/workspace-folder-cache";
import { invalidateWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";
import {
  loadWorkspaceTreePayload,
  readCachedWorkspaceTreePayload,
  resolveWorkspaceTreeClientError,
  writeWorkspaceTreePayload,
} from "@/lib/workspace-tree-client";

export function useSidebarFilesPanelTree({
  currentFileId,
  currentFolderId,
  workspaceUuid,
}: {
  currentFileId?: string;
  currentFolderId?: string;
  workspaceUuid: string | null;
}) {
  const [folderTree, setFolderTree] = useState<SidebarFolderNode[]>([]);
  const [fileTree, setFileTree] = useState<SidebarFileNode[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedTreePaths, setExpandedTreePaths] = useState<Set<string>>(
    new Set()
  );

  const fileTreePanelRef = useRef<HTMLDivElement | null>(null);
  const expandedTreePathsRef = useRef<Set<string>>(new Set());
  const fileTreeRef = useRef<SidebarFileNode[]>([]);
  const folderTreeRef = useRef<SidebarFolderNode[]>([]);
  const lastTreeRevealTargetRef = useRef<string | null>(null);
  const lastAutoExpandedTargetRef = useRef<string | null>(null);
  const treeRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const loadedWorkspaceRef = useRef<string | null>(null);
  const prevWorkspaceUuidRef = useRef<string | null>(null);

  const expandedTreeStorageKey = workspaceUuid
    ? `files-tree-expanded:${workspaceUuid}`
    : null;
  const expandedTreePathIds = useMemo(
    () => Array.from(expandedTreePaths),
    [expandedTreePaths]
  );
  const rootFolderId = useMemo(
    () => resolveSidebarRootFolderId(folderTree),
    [folderTree]
  );

  useEffect(() => {
    expandedTreePathsRef.current = expandedTreePaths;
  }, [expandedTreePaths]);

  useEffect(() => {
    fileTreeRef.current = fileTree;
  }, [fileTree]);

  useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  const loadWorkspaceTree = useCallback(async (workspaceId: string) => {
    setLoading(true);
    setLoadFailed(false);
    setErrorMessage(null);
    const cached = readCachedWorkspaceTreePayload<
      SidebarFolderNode,
      SidebarFileNode
    >(workspaceId);
    if (cached) {
      setFolderTree(cached.folders);
      setFileTree(cached.files);
    }

    try {
      const payload = await loadWorkspaceTreePayload<
        SidebarFolderNode,
        SidebarFileNode
      >(workspaceId);
      if (!payload) {
        setErrorMessage("Unable to load files.");
        setLoadFailed(true);
        return;
      }

      setFolderTree(payload.folders);
      setFileTree(payload.files);
      setErrorMessage(null);
      setLoadFailed(false);
      writeWorkspaceTreePayload(workspaceId, payload);
    } catch (error) {
      setErrorMessage(resolveWorkspaceTreeClientError(error));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshWorkspaceTreeDebounced = useCallback(
    (workspaceId: string) => {
      if (treeRefreshDebounceRef.current) {
        clearTimeout(treeRefreshDebounceRef.current);
      }

      treeRefreshDebounceRef.current = setTimeout(() => {
        loadWorkspaceTree(workspaceId).catch(() => undefined);
      }, 150);
    },
    [loadWorkspaceTree]
  );

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    if (loadedWorkspaceRef.current === workspaceUuid) {
      return;
    }
    loadedWorkspaceRef.current = workspaceUuid;
    loadWorkspaceTree(workspaceUuid).catch(() => undefined);
  }, [loadWorkspaceTree, workspaceUuid]);

  useEffect(() => {
    if (!expandedTreeStorageKey) {
      return;
    }

    if (prevWorkspaceUuidRef.current !== expandedTreeStorageKey) {
      prevWorkspaceUuidRef.current = expandedTreeStorageKey;
      const storedValue = window.localStorage.getItem(expandedTreeStorageKey);
      if (!storedValue) {
        setExpandedTreePaths(new Set());
        return;
      }

      try {
        const parsed = JSON.parse(storedValue) as string[];
        setExpandedTreePaths(new Set(parsed));
      } catch {
        setExpandedTreePaths(new Set());
      }
    }
  }, [expandedTreeStorageKey]);

  useEffect(() => {
    if (!expandedTreeStorageKey) {
      return;
    }

    window.localStorage.setItem(
      expandedTreeStorageKey,
      JSON.stringify(Array.from(expandedTreePaths))
    );
  }, [expandedTreePaths, expandedTreeStorageKey]);

  useEffect(() => {
    if (folderTree.length === 0) {
      return;
    }

    const nextExpanded = buildSidebarRootExpandedIds(folderTree);
    setExpandedTreePaths((previous) => {
      const merged = new Set([...previous, ...nextExpanded]);
      if (
        merged.size === previous.size &&
        Array.from(previous).every((id) => merged.has(id))
      ) {
        return previous;
      }
      return merged;
    });
  }, [folderTree]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }

    const targetId = currentFileId ?? currentFolderId;
    if (!targetId) {
      lastAutoExpandedTargetRef.current = null;
      return;
    }

    const targetKey = `${workspaceUuid}:${targetId}`;
    if (lastAutoExpandedTargetRef.current === targetKey) {
      return;
    }

    const nextExpanded = buildSidebarAutoExpandedAncestorIds({
      currentFileId,
      currentFolderId,
      fileTree,
      folderTree,
    });
    if (!nextExpanded) {
      return;
    }

    lastAutoExpandedTargetRef.current = targetKey;
    setExpandedTreePaths((previous) => new Set([...previous, ...nextExpanded]));
  }, [currentFileId, currentFolderId, fileTree, folderTree, workspaceUuid]);

  useEffect(() => {
    const targetPath = currentFileId ?? currentFolderId;
    if (!targetPath) {
      return;
    }
    if (lastTreeRevealTargetRef.current === targetPath) {
      return;
    }

    const timer = setTimeout(() => {
      const panel = fileTreePanelRef.current;
      const target = panel?.querySelector<HTMLElement>(
        `[data-tree-id="${targetPath}"]`
      );
      if (!target) {
        return;
      }
      lastTreeRevealTargetRef.current = targetPath;
      target.scrollIntoView({ block: "nearest" });
    }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [currentFileId, currentFolderId]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }

    const connection = createFilesRealtimeConnection({
      onInvalidate: (detail) => {
        invalidateWorkspaceFolderCache(workspaceUuid, detail?.folderId);
        invalidateWorkspaceMarkdownCache(workspaceUuid);
        const nextTree = applySidebarFilesRealtimeInvalidation({
          detail,
          expandedTreePaths: expandedTreePathsRef.current,
          fileTree: fileTreeRef.current,
          folderTree: folderTreeRef.current,
        });
        if (nextTree) {
          setExpandedTreePaths(nextTree.expandedTreePaths);
          setFileTree(nextTree.fileTree);
          setFolderTree(nextTree.folderTree);
          writeWorkspaceTreePayload(workspaceUuid, {
            files: nextTree.fileTree,
            folders: nextTree.folderTree,
          });
          return;
        }
        refreshWorkspaceTreeDebounced(workspaceUuid);
      },
      workspaceUuid,
    });
    connection.start();

    return () => {
      connection.stop();
      if (treeRefreshDebounceRef.current) {
        clearTimeout(treeRefreshDebounceRef.current);
        treeRefreshDebounceRef.current = null;
      }
    };
  }, [refreshWorkspaceTreeDebounced, workspaceUuid]);

  return {
    errorMessage,
    expandedTreePathIds,
    fileTree,
    fileTreePanelRef,
    folderTree,
    loadFailed,
    loading,
    onExpandedChange: (itemIds: string[]) => {
      setExpandedTreePaths(new Set(itemIds));
    },
    rootFolderId,
    setFileTree,
    setFolderTree,
  };
}
