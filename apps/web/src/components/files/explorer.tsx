"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  FileText,
  Folder,
  FolderOpen,
  Grid3X3,
  ImageIcon,
  LayoutList,
  Search,
  Share2,
  Upload,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avenire/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@avenire/ui/components/progress";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { Skeleton } from "@avenire/ui/components/skeleton";
import { SidebarTrigger } from "@avenire/ui/components/sidebar";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import {
  DASHBOARD_FILES_FOCUS_SEARCH_EVENT,
  DASHBOARD_FILES_NEW_NOTE_EVENT,
} from "@/lib/file-events";
import { useFileSelection } from "@/hooks/use-file-selection";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

const PDFViewer = dynamic(() => import("@/components/files/pdf-viewer"), {
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border/70 bg-card text-sm">
      Loading PDF...
    </div>
  ),
  ssr: false,
});

type UploadStatus = "failed" | "queued" | "uploaded" | "uploading";

interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
}

interface FileRecord {
  id: string;
  name: string;
  storageUrl: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
}

interface UploadQueueItem {
  error?: string;
  id: string;
  name: string;
  sizeLabel: string;
  status: UploadStatus;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toUpdatedLabel(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function detectPreviewKind(file: FileRecord) {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const ext = getExtension(file.name);
  const imageExt = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);
  const videoExt = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
  const audioExt = new Set([".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac"]);

  return {
    isImage: mime.startsWith("image/") || imageExt.has(ext),
    isPdf: mime === "application/pdf" || ext === ".pdf",
    isVideo: mime.startsWith("video/") || videoExt.has(ext),
    isAudio: mime.startsWith("audio/") || audioExt.has(ext),
  };
}

function statusMeta(status: UploadStatus) {
  switch (status) {
    case "queued":
      return {
        icon: <AlertCircle className="size-3.5 text-muted-foreground" />,
        label: "Queued",
        progress: 10,
      };
    case "uploading":
      return {
        icon: <Spinner className="size-3.5" />,
        label: "Uploading",
        progress: 55,
      };
    case "uploaded":
      return {
        icon: <CheckCircle2 className="size-3.5 text-emerald-500" />,
        label: "Uploaded",
        progress: 100,
      };
    case "failed":
      return {
        icon: <XCircle className="size-3.5 text-destructive" />,
        label: "Failed",
        progress: 100,
      };
    default:
      return {
        icon: <AlertCircle className="size-3.5 text-muted-foreground" />,
        label: "Queued",
        progress: 10,
      };
  }
}

export function FileExplorer() {
  const router = useRouter();
  const params = useParams<{ workspaceUuid: string; folderUuid: string }>();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const queueFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workspaceUuid = params.workspaceUuid;
  const currentFolderId = params.folderUuid;

  const [query, setQuery] = useState("");
  const [allFolders, setAllFolders] = useState<FolderRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [canvasDropActive, setCanvasDropActive] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesItem, setPropertiesItem] = useState<{
    kind: "file" | "folder";
    id: string;
    name: string;
    detail?: string;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{
    mode: "create-folder" | "rename-file" | "rename-folder";
    id?: string;
    parentId?: string;
    value: string;
  } | null>(null);

  const { startUpload } = useUploadThing("fileExplorerUploader");
  const selection = useFileSelection({ gridRef, itemRefs });

  const selectedFileParam = searchParams.get("file");
  const activeFile = useMemo(
    () => files.find((file) => file.id === selectedFileParam) ?? null,
    [files, selectedFileParam],
  );

  const filteredFolders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return folders;
    }

    return folders.filter((folder) => folder.name.toLowerCase().includes(term));
  }, [folders, query]);

  const filteredFiles = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return files;
    }

    return files.filter((file) => file.name.toLowerCase().includes(term));
  }, [files, query]);

  const visibleItemIds = useMemo(
    () => [...filteredFolders.map((folder) => folder.id), ...filteredFiles.map((file) => file.id)],
    [filteredFiles, filteredFolders],
  );

  const uploadCount = uploadQueue.filter(
    (item) => item.status === "queued" || item.status === "uploading",
  ).length;
  const failedCount = uploadQueue.filter((item) => item.status === "failed").length;

  const loadFolder = useCallback(async () => {
    if (!workspaceUuid || !currentFolderId) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/folders/${currentFolderId}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        folders?: FolderRecord[];
        files?: FileRecord[];
        ancestors?: FolderRecord[];
      };

      setFolders(payload.folders ?? []);
      setFiles(payload.files ?? []);
      setBreadcrumbs(payload.ancestors ?? []);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, workspaceUuid]);

  const loadTree = useCallback(async () => {
    if (!workspaceUuid) {
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceUuid}/tree`, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { folders?: FolderRecord[] };
      setAllFolders(payload.folders ?? []);
    } catch {
      // ignore
    }
  }, [workspaceUuid]);

  useEffect(() => {
    void loadFolder();
  }, [loadFolder]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  useEffect(() => {
    setVideoLoadFailed(false);
    setAudioLoadFailed(false);
  }, [activeFile?.id]);

  useEffect(() => {
    const onFocusSearch = () => {
      searchInputRef.current?.focus();
    };

    const onNewNote = () => {
      // Placeholder until note entity model is introduced.
      fileInputRef.current?.click();
    };

    window.addEventListener(DASHBOARD_FILES_FOCUS_SEARCH_EVENT, onFocusSearch);
    window.addEventListener(DASHBOARD_FILES_NEW_NOTE_EVENT, onNewNote);

    return () => {
      window.removeEventListener(DASHBOARD_FILES_FOCUS_SEARCH_EVENT, onFocusSearch);
      window.removeEventListener(DASHBOARD_FILES_NEW_NOTE_EVENT, onNewNote);
    };
  }, []);

  useEffect(() => {
    if (queueFadeTimerRef.current) {
      clearTimeout(queueFadeTimerRef.current);
      queueFadeTimerRef.current = null;
    }

    if (uploadQueue.length === 0) {
      setIsQueueVisible(false);
      return;
    }

    const hasActiveUploads = uploadQueue.some(
      (item) => item.status === "queued" || item.status === "uploading",
    );

    setIsQueueVisible(true);

    if (hasActiveUploads) {
      return;
    }

    queueFadeTimerRef.current = setTimeout(() => {
      setIsQueueVisible(false);
    }, 4500);

    return () => {
      if (queueFadeTimerRef.current) {
        clearTimeout(queueFadeTimerRef.current);
      }
    };
  }, [uploadQueue]);

  const navigateToFolder = useCallback(
    (folderId: string) => {
      if (!workspaceUuid) {
        return;
      }

      router.push(
        `/dashboard/files/${workspaceUuid}/folder/${folderId}` as Route,
      );
    },
    [router, workspaceUuid],
  );

  const selectFile = useCallback(
    (fileId: string | null) => {
      if (!workspaceUuid || !currentFolderId) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (fileId) {
        params.set("file", fileId);
      } else {
        params.delete("file");
      }

      const query = params.toString();
      const target = query.length
        ? `/dashboard/files/${workspaceUuid}/folder/${currentFolderId}?${query}`
        : `/dashboard/files/${workspaceUuid}/folder/${currentFolderId}`;

      router.replace(target as Route);
    },
    [currentFolderId, router, searchParams, workspaceUuid],
  );

  const queueUploads = useCallback(
    (incomingFiles: File[]) => {
      if (!workspaceUuid || !currentFolderId || incomingFiles.length === 0) {
        return;
      }

      const queueEntries = incomingFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        sizeLabel: formatBytes(file.size),
        status: "queued" as const,
      }));

      setUploadQueue((previous) => [...queueEntries, ...previous]);

      void (async () => {
        for (const [index, file] of incomingFiles.entries()) {
          const queueItemId = queueEntries[index]?.id;
          if (!queueItemId) {
            continue;
          }

          setUploadQueue((previous) =>
            previous.map((item) =>
              item.id === queueItemId ? { ...item, status: "uploading" } : item,
            ),
          );

          try {
            const uploaded = (await startUpload([file]))?.[0] as
              | { key?: string; ufsUrl?: string; url?: string; name?: string; size?: number; contentType?: string }
              | undefined;

            if (!uploaded?.key || !(uploaded.ufsUrl ?? uploaded.url)) {
              throw new Error("Upload returned no file metadata");
            }

            const registerResponse = await fetch(
              `/api/workspaces/${workspaceUuid}/files/register`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  folderId: currentFolderId,
                  storageKey: uploaded.key,
                  storageUrl: uploaded.ufsUrl ?? uploaded.url,
                  name: uploaded.name ?? file.name,
                  mimeType: uploaded.contentType ?? file.type,
                  sizeBytes: uploaded.size ?? file.size,
                }),
              },
            );

            if (!registerResponse.ok) {
              throw new Error("File metadata registration failed");
            }

            setUploadQueue((previous) =>
              previous.map((item) =>
                item.id === queueItemId ? { ...item, status: "uploaded" } : item,
              ),
            );

            await loadFolder();
          } catch (error) {
            setUploadQueue((previous) =>
              previous.map((item) =>
                item.id === queueItemId
                  ? {
                      ...item,
                      status: "failed",
                      error:
                        error instanceof Error ? error.message : "Unable to upload file",
                    }
                  : item,
              ),
            );
          }
        }
      })();
    },
    [currentFolderId, loadFolder, startUpload, workspaceUuid],
  );

  const queueCard = (
    <Card
      className={cn(
        "fixed right-4 bottom-4 z-40 w-[20rem] border border-border/70 bg-background/90 py-3 shadow-lg backdrop-blur transition-all duration-500",
        isQueueVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-xs">
          <span>Upload Queue</span>
          <Badge
            variant={
              uploadCount > 0
                ? "secondary"
                : failedCount > 0
                  ? "destructive"
                  : "outline"
            }
          >
            {uploadCount > 0
              ? `${uploadCount} active`
              : failedCount > 0
                ? `${failedCount} failed`
                : "Idle"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-56 space-y-2 overflow-y-auto">
        {uploadQueue.length === 0 ? (
          <p className="text-muted-foreground text-xs">New uploads will appear here.</p>
        ) : (
          uploadQueue.slice(0, 8).map((item) => {
            const meta = statusMeta(item.status);
            return (
              <div className="rounded-md border p-2" key={item.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <span>{meta.icon}</span>
                </div>
                <Progress value={meta.progress}>
                  <ProgressLabel className="text-[11px]">{meta.label}</ProgressLabel>
                  <ProgressValue className="text-[11px]" />
                </Progress>
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {item.sizeLabel}
                </p>
                {item.error ? (
                  <p className="mt-1 text-[11px] text-destructive">{item.error}</p>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );

  const createFolder = useCallback(
    async (parentId: string, name: string) => {
      if (!workspaceUuid) {
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, name: trimmedName }),
      });
      await Promise.all([loadFolder(), loadTree()]);
    },
    [loadFolder, loadTree, workspaceUuid],
  );

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      if (!workspaceUuid) {
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      await Promise.all([loadFolder(), loadTree()]);
    },
    [loadFolder, loadTree, workspaceUuid],
  );

  const renameFile = useCallback(
    async (fileId: string, name: string) => {
      if (!workspaceUuid) {
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      await loadFolder();
    },
    [loadFolder, workspaceUuid],
  );

  const moveFolder = useCallback(
    async (folderId: string, targetFolderId: string) => {
      if (!workspaceUuid) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetFolderId }),
      });
      await Promise.all([loadFolder(), loadTree()]);
    },
    [loadFolder, loadTree, workspaceUuid],
  );

  const moveFile = useCallback(
    async (fileId: string, targetFolderId: string) => {
      if (!workspaceUuid) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      await loadFolder();
    },
    [loadFolder, workspaceUuid],
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (!workspaceUuid) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/folders/${folderId}`, {
        method: "DELETE",
      });
      await Promise.all([loadFolder(), loadTree()]);
    },
    [loadFolder, loadTree, workspaceUuid],
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!workspaceUuid) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/files/${fileId}`, {
        method: "DELETE",
      });
      await loadFolder();
    },
    [loadFolder, workspaceUuid],
  );

  const moveItemsToFolder = useCallback(
    async (itemIds: string[], targetFolderId: string) => {
      if (itemIds.length === 0) {
        return;
      }

      const folderIds = new Set(folders.map((folder) => folder.id));
      const fileIds = new Set(files.map((file) => file.id));

      await Promise.all(
        itemIds.map(async (itemId) => {
          if (folderIds.has(itemId) && itemId !== targetFolderId) {
            await moveFolder(itemId, targetFolderId);
            return;
          }
          if (fileIds.has(itemId)) {
            await moveFile(itemId, targetFolderId);
          }
        }),
      );
      selection.clearSelection();
    },
    [files, folders, moveFile, moveFolder, selection],
  );

  const openCreateFolderDialog = (parentId: string) => {
    setEditDialog({
      mode: "create-folder",
      parentId,
      value: "",
    });
  };

  const openRenameFolderDialog = (folder: FolderRecord) => {
    setEditDialog({
      mode: "rename-folder",
      id: folder.id,
      value: folder.name,
    });
  };

  const openRenameFileDialog = (file: FileRecord) => {
    setEditDialog({
      mode: "rename-file",
      id: file.id,
      value: file.name,
    });
  };

  const applyEditDialog = async () => {
    if (!editDialog) {
      return;
    }

    if (editDialog.mode === "create-folder" && editDialog.parentId) {
      await createFolder(editDialog.parentId, editDialog.value);
    }

    if (editDialog.mode === "rename-folder" && editDialog.id) {
      await renameFolder(editDialog.id, editDialog.value);
    }

    if (editDialog.mode === "rename-file" && editDialog.id) {
      await renameFile(editDialog.id, editDialog.value);
    }

    setEditDialog(null);
  };

  const shareActiveFileWithEmail = async () => {
    if (!activeFile || !workspaceUuid || !shareEmail.trim()) {
      return;
    }

    setShareBusy(true);
    setShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/share/grants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: shareEmail.trim() }),
        },
      );
      if (!response.ok) {
        setShareStatus("Unable to add access.");
        return;
      }
      setShareEmail("");
      setShareStatus("Access granted.");
    } finally {
      setShareBusy(false);
    }
  };

  const generateActiveFileShareLink = async () => {
    if (!activeFile || !workspaceUuid) {
      return;
    }
    setShareBusy(true);
    setShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/share/link`,
        { method: "POST" },
      );
      if (!response.ok) {
        setShareStatus("Unable to generate link.");
        return;
      }
      const payload = (await response.json()) as { shareUrl?: string };
      if (payload.shareUrl) {
        setShareLink(payload.shareUrl);
        setShareStatus("Share link generated.");
      }
    } finally {
      setShareBusy(false);
    }
  };

  if (activeFile) {
    const { isAudio, isImage, isPdf, isVideo } = detectPreviewKind(activeFile);

    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex h-12 items-center justify-between gap-2 border-b border-border/70 bg-card/40 px-3">
          <div className="flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
            <Button
              className="size-6"
              onClick={() => selectFile(null)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
            <span className="truncate text-foreground">{activeFile.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden text-muted-foreground text-xs sm:inline">
              Edited {toUpdatedLabel(activeFile.createdAt)} ago
            </span>
            <Dialog>
              <DialogTrigger
                render={<Button className="size-6" size="icon-xs" type="button" variant="ghost" />}
              >
                <Share2 />
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Share file</DialogTitle>
                  <DialogDescription>
                    Grant read-only access by email or create a signed link.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="file-share-email">
                    Add people
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file-share-email"
                      onChange={(event) => setShareEmail(event.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      value={shareEmail}
                    />
                    <Button
                      disabled={shareBusy}
                      onClick={() => {
                        void shareActiveFileWithEmail();
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm">Share link (7 days)</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={shareLink ?? ""} />
                    <Button
                      disabled={shareBusy}
                      onClick={() => {
                        void generateActiveFileShareLink();
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Generate
                    </Button>
                    <Button
                      disabled={!shareLink}
                      onClick={() => {
                        if (!shareLink) {
                          return;
                        }
                        void navigator.clipboard.writeText(shareLink);
                        setShareStatus("Link copied.");
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                {shareStatus ? (
                  <p className="text-muted-foreground text-xs">{shareStatus}</p>
                ) : null}
              </DialogContent>
            </Dialog>
            <Button
              className="size-6"
              onClick={() => window.open(activeFile.storageUrl, "_blank", "noopener,noreferrer")}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <ArrowUp />
            </Button>
          </div>
        </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/25">
          {isPdf ? (
            <div className="h-full p-3">
              <PDFViewer
                className="h-[calc(100svh-7.5rem)] max-h-none rounded-xl border border-border/70"
                source={activeFile.storageUrl}
              />
            </div>
          ) : isVideo && !videoLoadFailed ? (
            <div className="mx-auto flex h-full max-w-[1200px] items-center justify-center p-4">
              <div className="w-full rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
                <video
                  className="h-auto max-h-[70vh] w-full rounded-xl bg-black"
                  controls
                  onError={() => setVideoLoadFailed(true)}
                  preload="metadata"
                >
                  <source src={activeFile.storageUrl} type={activeFile.mimeType ?? undefined} />
                </video>
              </div>
            </div>
          ) : isAudio && !audioLoadFailed ? (
            <div className="mx-auto flex h-full max-w-[900px] items-center justify-center p-4">
              <div className="w-full rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <p className="mb-3 font-medium text-sm">{activeFile.name}</p>
                <audio
                  className="w-full"
                  controls
                  onError={() => setAudioLoadFailed(true)}
                  preload="metadata"
                >
                  <source src={activeFile.storageUrl} type={activeFile.mimeType ?? undefined} />
                </audio>
              </div>
            </div>
          ) : isImage ? (
            <div className="mx-auto flex h-full max-w-[1200px] flex-col gap-3 p-4">
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border/70 bg-white p-4">
                <img
                  alt={activeFile.name}
                  className="h-auto max-h-full max-w-full rounded-md object-contain"
                  src={activeFile.storageUrl}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[55vh] flex-col items-center justify-center gap-3 rounded-md border border-border/70 bg-card p-4 text-center">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">In-app preview is unavailable for this file type.</p>
              <Button
                onClick={() => window.open(activeFile.storageUrl, "_blank", "noopener,noreferrer")}
                size="sm"
                type="button"
                variant="outline"
              >
                Open in new tab
              </Button>
            </div>
          )}
        </div>
        {queueCard}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-3">
        <SidebarTrigger className="h-8 w-8 rounded-md" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-8 rounded-md px-2"
                size="sm"
                type="button"
                variant="outline"
              />
            }
          >
            <span className="text-base leading-none">+</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              Upload file
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.dispatchEvent(new Event(DASHBOARD_FILES_FOCUS_SEARCH_EVENT))
              }
            >
              Search tools
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-1 flex min-w-0 items-center gap-1 overflow-x-auto">
          {breadcrumbs.map((crumb) => (
            <Button
              className="h-7 rounded-md px-2 text-xs"
              key={crumb.id}
              onClick={() => navigateToFolder(crumb.id)}
              size="xs"
              type="button"
              variant={crumb.id === currentFolderId ? "secondary" : "ghost"}
            >
              {crumb.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-b border-border/70 px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <div className="pointer-events-none absolute top-1/2 left-10 -translate-y-1/2">
            <Badge className="h-5 rounded-md px-1.5 text-[10px]" variant="secondary">
              {breadcrumbs[breadcrumbs.length - 1]?.name ?? "Workspace"}
            </Badge>
          </div>
          <Input
            aria-label="Search files"
            className="h-10 rounded-xl border-border/70 bg-background pl-9 sm:pl-32"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search anything..."
            ref={searchInputRef}
            value={query}
          />
        </div>
      </div>

      <input
        className="sr-only"
        multiple
        onChange={(event) => {
          const incoming = Array.from(event.target.files ?? []);
          queueUploads(incoming);
          event.currentTarget.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />

      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="font-semibold text-lg tracking-tight">Workspace</h2>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-md"
            disabled={breadcrumbs.length < 2}
            onClick={() => {
              const parent = breadcrumbs[breadcrumbs.length - 2];
              if (parent) {
                navigateToFolder(parent.id);
              }
            }}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ArrowUp />
          </Button>
          <Button
            className="rounded-md"
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Upload />
            Upload
          </Button>
          <Button className="rounded-md" size="icon-sm" type="button" variant="outline">
            <Grid3X3 />
          </Button>
          <Button className="rounded-md" size="icon-sm" type="button" variant="outline">
            <LayoutList />
          </Button>
          <Badge variant="outline">
            {filteredFolders.length + filteredFiles.length} items
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ContextMenu>
          <ContextMenuTrigger>
            <ScrollArea className="h-full">
              <div
                className={cn(
                  "relative min-h-full px-3 pb-3",
                  canvasDropActive && "bg-emerald-500/5",
                )}
                onDragLeave={() => {
                  setCanvasDropActive(false);
                  setDropTargetId(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setCanvasDropActive(true);
                  setDropTargetId(currentFolderId);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setCanvasDropActive(false);
                  setDropTargetId(null);
                  const sourceIds = draggingIds.length > 0 ? draggingIds : Array.from(selection.selectedIds);
                  void moveItemsToFolder(sourceIds, currentFolderId);
                  setDraggingIds([]);
                }}
              >
                {loading ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <Card className="rounded-2xl border border-border/70 bg-card py-2" key={index}>
                        <CardContent className="space-y-3 pt-0">
                          <Skeleton className="mx-auto h-24 w-24 rounded-2xl" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div
                    className="relative min-h-[calc(100vh-14rem)]"
                    onPointerDown={selection.startDragSelection}
                    ref={gridRef}
                  >
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {filteredFolders.map((folder) => (
                      <ContextMenu key={folder.id}>
                        <ContextMenuTrigger>
                          <Card
                            className={cn(
                              "cursor-pointer rounded-2xl border border-border/70 bg-card py-2 transition hover:border-emerald-500/35",
                              selection.selectedIds.has(folder.id) && "border-emerald-500 bg-emerald-500/5",
                              dropTargetId === folder.id && "ring-2 ring-emerald-400/70",
                            )}
                            data-item-card="true"
                            draggable
                            onClick={(event) => selection.handleItemClick(event, folder.id, visibleItemIds)}
                            onDoubleClick={() => navigateToFolder(folder.id)}
                            onDragEnd={() => {
                              setDraggingIds([]);
                              setDropTargetId(null);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDropTargetId(folder.id);
                            }}
                            onDragStart={(event) => {
                              const sourceIds = selection.prepareDrag(folder.id);
                              setDraggingIds(sourceIds);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", sourceIds.join(","));
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const sourceIds = draggingIds.length > 0 ? draggingIds : Array.from(selection.selectedIds);
                              setDropTargetId(null);
                              void moveItemsToFolder(sourceIds, folder.id);
                              setDraggingIds([]);
                            }}
                            ref={(node: HTMLDivElement | null) => {
                              if (!node) {
                                itemRefs.current.delete(folder.id);
                                return;
                              }
                              itemRefs.current.set(folder.id, node);
                            }}
                          >
                            <CardContent className="space-y-3 pt-0">
                              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                                <Folder className="size-10 text-emerald-600" />
                              </div>
                              <div className="space-y-1">
                                <p className="truncate font-medium text-sm">{folder.name}</p>
                                <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                  <FolderOpen className="size-3.5" />
                                  <span>Folder</span>
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => navigateToFolder(folder.id)}>
                            Open
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => openRenameFolderDialog(folder)}>
                            Rename
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => openCreateFolderDialog(folder.id)}>
                            New folder here
                          </ContextMenuItem>
                          <ContextMenuSub>
                            <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                              {allFolders
                                .filter((target) => target.id !== folder.id)
                                .slice(0, 20)
                                .map((target) => (
                                  <ContextMenuItem
                                    key={target.id}
                                    onClick={() => {
                                      void moveFolder(folder.id, target.id);
                                    }}
                                  >
                                    {target.name}
                                  </ContextMenuItem>
                                ))}
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                          <ContextMenuItem
                            onClick={() => {
                              setPropertiesItem({
                                kind: "folder",
                                id: folder.id,
                                name: folder.name,
                                detail: "Folder",
                              });
                              setPropertiesOpen(true);
                            }}
                          >
                            Properties
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => {
                              void deleteFolder(folder.id);
                            }}
                            variant="destructive"
                          >
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}

                    {filteredFiles.map((file) => {
                      const { isImage, isPdf } = detectPreviewKind(file);
                      return (
                        <ContextMenu key={file.id}>
                          <ContextMenuTrigger>
                            <Card
                              className={cn(
                                "cursor-pointer rounded-2xl border border-border/70 bg-card py-2 transition hover:border-emerald-500/35",
                                selection.selectedIds.has(file.id) && "border-emerald-500 bg-emerald-500/5",
                              )}
                              data-item-card="true"
                              draggable
                              onClick={(event) => selection.handleItemClick(event, file.id, visibleItemIds)}
                              onDoubleClick={() => selectFile(file.id)}
                              onDragEnd={() => {
                                setDraggingIds([]);
                                setDropTargetId(null);
                              }}
                              onDragStart={(event) => {
                                const sourceIds = selection.prepareDrag(file.id);
                                setDraggingIds(sourceIds);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", sourceIds.join(","));
                              }}
                              ref={(node: HTMLDivElement | null) => {
                                if (!node) {
                                  itemRefs.current.delete(file.id);
                                  return;
                                }
                                itemRefs.current.set(file.id, node);
                              }}
                            >
                              <CardContent className="space-y-3 pt-0">
                                {isImage ? (
                                  <div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-border/70 bg-muted">
                                    <img
                                      alt={file.name}
                                      className="h-full w-full object-cover"
                                      src={file.storageUrl}
                                    />
                                  </div>
                                ) : (
                                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-border/70 bg-muted/60">
                                    <FileText
                                      className={cn(
                                        "size-9",
                                        isPdf ? "text-rose-600" : "text-sky-600",
                                      )}
                                    />
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <p className="truncate font-medium text-sm">{file.name}</p>
                                  <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    {isImage ? (
                                      <ImageIcon className="size-3.5" />
                                    ) : (
                                      <FileText className="size-3.5" />
                                    )}
                                    <span>{formatBytes(file.sizeBytes)}</span>
                                    <span className="ml-auto">{toUpdatedLabel(file.createdAt)}</span>
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => selectFile(file.id)}>Open</ContextMenuItem>
                            <ContextMenuItem onClick={() => openRenameFileDialog(file)}>
                              Rename
                            </ContextMenuItem>
                            <ContextMenuSub>
                              <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
                              <ContextMenuSubContent>
                                {allFolders.slice(0, 20).map((target) => (
                                  <ContextMenuItem
                                    key={target.id}
                                    onClick={() => {
                                      void moveFile(file.id, target.id);
                                    }}
                                  >
                                    {target.name}
                                  </ContextMenuItem>
                                ))}
                              </ContextMenuSubContent>
                            </ContextMenuSub>
                            <ContextMenuItem
                              onClick={() => {
                                setPropertiesItem({
                                  kind: "file",
                                  id: file.id,
                                  name: file.name,
                                  detail: `${formatBytes(file.sizeBytes)} • ${file.mimeType ?? "unknown"}`,
                                });
                                setPropertiesOpen(true);
                              }}
                            >
                              Properties
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => {
                                void deleteFile(file.id);
                              }}
                              variant="destructive"
                            >
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                    </div>
                    {selection.selectionRect ? (
                      <div
                        className="pointer-events-none absolute z-20 rounded-md border border-emerald-400 bg-emerald-400/15"
                        style={{
                          left: selection.selectionRect.x,
                          top: selection.selectionRect.y,
                          width: selection.selectionRect.width,
                          height: selection.selectionRect.height,
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </ScrollArea>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => openCreateFolderDialog(currentFolderId)}>
              New folder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => fileInputRef.current?.click()}>
              Upload file
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void loadFolder()}>
              Refresh
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <Dialog onOpenChange={setPropertiesOpen} open={propertiesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Properties</DialogTitle>
            <DialogDescription>Item metadata and identifiers.</DialogDescription>
          </DialogHeader>
          {propertiesItem ? (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p><span className="font-medium">Name:</span> {propertiesItem.name}</p>
              <p><span className="font-medium">Type:</span> {propertiesItem.kind}</p>
              <p><span className="font-medium">ID:</span> {propertiesItem.id}</p>
              {propertiesItem.detail ? (
                <p><span className="font-medium">Detail:</span> {propertiesItem.detail}</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditDialog(null);
          }
        }}
        open={Boolean(editDialog)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialog?.mode === "create-folder"
                ? "Create folder"
                : editDialog?.mode === "rename-folder"
                  ? "Rename folder"
                  : "Rename file"}
            </DialogTitle>
            <DialogDescription>
              {editDialog?.mode === "create-folder"
                ? "Choose a name for the new folder."
                : "Update the item name."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="item-name-input">
              Name
            </label>
            <Input
              autoFocus
              id="item-name-input"
              onChange={(event) => {
                if (!editDialog) {
                  return;
                }
                setEditDialog({ ...editDialog, value: event.target.value });
              }}
              placeholder="Name"
              value={editDialog?.value ?? ""}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setEditDialog(null)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!editDialog?.value.trim()}
              onClick={() => {
                void applyEditDialog();
              }}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {queueCard}
    </div>
  );
}
