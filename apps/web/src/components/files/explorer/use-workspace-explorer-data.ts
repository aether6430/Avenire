"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  applyExplorerFilesRealtimeInvalidation,
  type ExplorerFilesInvalidationPayload,
} from "@/components/files/explorer/explorer-realtime-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  loadWorkspaceFolderPayload,
  loadWorkspacePropertyDefinitionsPayload,
} from "@/components/files/explorer/workspace-data-loader";
import {
  deriveWorkspaceFolderSnapshotFromTree,
  readVisibleWorkspaceFolderSnapshot,
} from "@/components/files/explorer/workspace-folder-snapshot";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { writeWorkspaceFolderCache } from "@/lib/workspace-folder-cache";
import {
  loadWorkspaceTreePayload,
  readCachedWorkspaceTreePayload,
  writeWorkspaceTreePayload,
} from "@/lib/workspace-tree-client";

interface UseWorkspaceExplorerDataInput {
  currentFolderId: string;
  workspaceUuid: string;
}

export function useWorkspaceExplorerData({
  currentFolderId,
  workspaceUuid,
}: UseWorkspaceExplorerDataInput) {
  const [allFolders, setAllFolders] = useState<FolderRecord[]>([]);
  const [allFiles, setAllFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [propertyDefinitions, setPropertyDefinitions] = useState<
    WorkspacePropertyDefinition[]
  >([]);
  const allFilesRef = useRef<FileRecord[]>([]);
  const allFoldersRef = useRef<FolderRecord[]>([]);
  const currentFolderIdRef = useRef(currentFolderId);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    allFilesRef.current = allFiles;
  }, [allFiles]);

  useEffect(() => {
    allFoldersRef.current = allFolders;
  }, [allFolders]);

  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  const applyVisibleSnapshot = useCallback(
    (snapshot: {
      ancestors: FolderRecord[];
      files: FileRecord[];
      folders: FolderRecord[];
    }) => {
      setLoading(false);
      setFolders(snapshot.folders);
      setFiles(snapshot.files);
      setBreadcrumbs(snapshot.ancestors);
      writeWorkspaceFolderCache<FolderRecord, FileRecord>(
        workspaceUuid,
        currentFolderId,
        snapshot
      );
    },
    [currentFolderId, workspaceUuid]
  );
  const clearVisibleSnapshot = useCallback(() => {
    setLoading(false);
    setFolders([]);
    setFiles([]);
    setBreadcrumbs([]);
  }, []);

  const loadFolder = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!(workspaceUuid && currentFolderId)) {
        return;
      }

      const silent = options?.silent ?? false;
      const visibleSnapshot = readVisibleWorkspaceFolderSnapshot(
        workspaceUuid,
        currentFolderId
      );

      if (visibleSnapshot) {
        setLoading(false);
        setFolders(visibleSnapshot.folders);
        setFiles(visibleSnapshot.files);
        setBreadcrumbs(visibleSnapshot.ancestors);
      }

      if (!(silent || visibleSnapshot)) {
        setLoading(true);
      }

      try {
        const payload = await loadWorkspaceFolderPayload(
          workspaceUuid,
          currentFolderId
        );

        if (!payload) {
          clearVisibleSnapshot();
          return;
        }

        applyVisibleSnapshot(payload);
      } finally {
        if (!(silent || visibleSnapshot)) {
          setLoading(false);
        }
      }
    },
    [applyVisibleSnapshot, clearVisibleSnapshot, currentFolderId, workspaceUuid]
  );

  const loadTree = useCallback(async () => {
    if (!workspaceUuid) {
      return;
    }

    const cached = readCachedWorkspaceTreePayload<FolderRecord, FileRecord>(
      workspaceUuid
    );
    if (cached) {
      setAllFolders(cached.folders);
      setAllFiles(cached.files);
      const visibleSnapshot = deriveWorkspaceFolderSnapshotFromTree({
        folderId: currentFolderId,
        treePayload: cached,
      });
      if (visibleSnapshot) {
        applyVisibleSnapshot(visibleSnapshot);
      } else {
        clearVisibleSnapshot();
      }
    }

    try {
      const payload = await loadWorkspaceTreePayload<FolderRecord, FileRecord>(
        workspaceUuid
      );
      if (!payload) {
        return;
      }

      setAllFolders(payload.folders);
      setAllFiles(payload.files);
      const visibleSnapshot = deriveWorkspaceFolderSnapshotFromTree({
        folderId: currentFolderId,
        treePayload: payload,
      });
      if (visibleSnapshot) {
        applyVisibleSnapshot(visibleSnapshot);
      } else {
        clearVisibleSnapshot();
      }
    } catch {
      clearVisibleSnapshot();
    }
  }, [
    applyVisibleSnapshot,
    clearVisibleSnapshot,
    currentFolderId,
    workspaceUuid,
  ]);

  const refreshData = useCallback(() => {
    void loadFolder({ silent: true });
    void loadTree();
  }, [loadFolder, loadTree]);

  const refreshDataDebounced = useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }

    refreshDebounceRef.current = setTimeout(() => {
      refreshData();
    }, 300);
  }, [refreshData]);

  const applyFilesInvalidation = useCallback(
    (detail: ExplorerFilesInvalidationPayload | null) => {
      const nextTree = applyExplorerFilesRealtimeInvalidation({
        allFiles: allFilesRef.current,
        allFolders: allFoldersRef.current,
        detail,
      });
      if (!nextTree) {
        return false;
      }

      if (nextTree.deletedFolderIds.has(currentFolderIdRef.current)) {
        return false;
      }

      const nextSnapshot = deriveWorkspaceFolderSnapshotFromTree({
        folderId: currentFolderIdRef.current,
        treePayload: {
          files: nextTree.allFiles,
          folders: nextTree.allFolders,
        },
      });
      if (!nextSnapshot) {
        return false;
      }

      setAllFiles(nextTree.allFiles);
      setAllFolders(nextTree.allFolders);
      applyVisibleSnapshot(nextSnapshot);
      writeWorkspaceTreePayload(workspaceUuid, {
        files: nextTree.allFiles,
        folders: nextTree.allFolders,
      });
      return true;
    },
    [applyVisibleSnapshot, workspaceUuid]
  );

  useLayoutEffect(() => {
    if (!(workspaceUuid && currentFolderId)) {
      setLoading(false);
      setFolders([]);
      setFiles([]);
      setBreadcrumbs([]);
      return;
    }

    const visibleSnapshot = readVisibleWorkspaceFolderSnapshot(
      workspaceUuid,
      currentFolderId
    );
    if (!visibleSnapshot) {
      setFolders([]);
      setFiles([]);
      setBreadcrumbs([]);
      return;
    }

    setLoading(false);
    setFolders(visibleSnapshot.folders);
    setFiles(visibleSnapshot.files);
    setBreadcrumbs(visibleSnapshot.ancestors);
  }, [currentFolderId, workspaceUuid]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (!workspaceUuid) {
      setPropertyDefinitions([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const normalized =
          await loadWorkspacePropertyDefinitionsPayload(workspaceUuid);
        if (cancelled) {
          return;
        }
        setPropertyDefinitions(normalized);
      } catch {
        if (!cancelled) {
          setPropertyDefinitions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceUuid]);

  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }
    };
  }, []);

  return {
    allFiles,
    allFolders,
    breadcrumbs,
    files,
    folders,
    loadFolder,
    loadTree,
    loading,
    propertyDefinitions,
    refreshData,
    refreshDataDebounced,
    applyFilesInvalidation,
    setPropertyDefinitions,
  };
}
