"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@avenire/ui/components/drawer";
import { useProximityHover } from "@avenire/ui/hooks/use-proximity-hover";
import { springs } from "@avenire/ui/lib/springs";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpenText,
  DotsThree,
  Files,
  Gear,
  House,
  ListChecks,
  MagnifyingGlass,
  Chat as MessageSquare,
  Plus,
  Trash,
  Waveform,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { commandPaletteActions } from "@/stores/commandPaletteStore";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";
import { quickCaptureActions } from "@/stores/quickCaptureStore";

const MOBILE_CHAT_COMPOSER_OPEN_EVENT = "avenire:mobile-chat-composer-open";
const MOBILE_CHAT_COMPOSER_CLOSE_EVENT = "avenire:mobile-chat-composer-close";
const MOBILE_CHAT_COMPOSER_STATE_EVENT = "avenire:mobile-chat-composer-state";

interface MobileChatSummary {
  lastMessageAt?: string;
  slug: string;
  title: string;
}

interface MobileFlashcardSet {
  dueCount?: number;
  id: string;
  newCount?: number;
  title: string;
}

interface MobileTask {
  dueAt?: string | null;
  id: string;
  status?: string;
  title: string;
}

interface MobileWorkspaceFile {
  folderId?: string | null;
  id: string;
  name: string;
}

function createFreshNewChatHref() {
  return `/workspace/chats/new?fresh=${Date.now().toString(36)}` as Route;
}

export function MobileWorkspaceDock({
  activeWorkspace,
}: {
  activeWorkspace?: {
    rootFolderId: string;
    workspaceId: string;
  } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isChatRoute = pathname.startsWith("/workspace/chats");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<MobileChatSummary[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<MobileFlashcardSet[]>([]);
  const [mobileTasks, setMobileTasks] = useState<MobileTask[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<MobileWorkspaceFile[]>(
    []
  );
  const setSettingsOpen = useDashboardOverlayStore(
    (state) => state.setSettingsOpen
  );
  const setTrashOpen = useDashboardOverlayStore((state) => state.setTrashOpen);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const {
    activeIndex: proximityIndex,
    handlers: proximityHandlers,
    measureItems,
    registerItem,
  } = useProximityHover(dockRef, { axis: "x" });
  const filesHref = activeWorkspace
    ? (`/workspace/files/${activeWorkspace.workspaceId}/folder/${activeWorkspace.rootFolderId}` as Route)
    : ("/workspace/files" as Route);
  const items = useMemo(
    () => [
      {
        href: () => "/workspace" as Route,
        icon: House,
        isActive: pathname === "/workspace",
        label: "Home",
      },
      {
        href: () => "/workspace/flashcards" as Route,
        icon: BookOpenText,
        isActive: pathname.startsWith("/workspace/flashcards"),
        label: "Learn",
      },
      {
        href: () => "/workspace/tasks" as Route,
        icon: ListChecks,
        isActive: pathname.startsWith("/workspace/tasks"),
        label: "Tasks",
      },
      {
        href: () => filesHref,
        icon: Files,
        isActive: pathname.startsWith("/workspace/files"),
        label: "Workspace",
      },
      {
        href: createFreshNewChatHref,
        icon: MessageSquare,
        isActive: pathname.startsWith("/workspace/chats"),
        label: "Chat",
      },
    ],
    [filesHref, pathname]
  );
  const activeItem = items.find((item) => item.isActive) ?? items[0];
  const activeChatSlug = useMemo(() => {
    const match = pathname.match(/^\/workspace\/chats\/([^/?#]+)/);
    return match?.[1] && match[1] !== "new" ? match[1] : null;
  }, [pathname]);
  const activeChatTitle =
    recentChats.find((chat) => chat.slug === activeChatSlug)?.title ??
    (activeChatSlug ? "Chat" : "New chat");

  useEffect(() => {
    measureItems();
  }, [measureItems]);
  useEffect(() => {
    setDockExpanded((expanded) => (pathname && expanded ? false : expanded));
  }, [pathname]);

  useEffect(() => {
    if (!(isChatRoute || sheetOpen)) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/chat/history", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { chats?: MobileChatSummary[] } | null) => {
        setRecentChats((payload?.chats ?? []).slice(0, 12));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isChatRoute, sheetOpen]);

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setComposerOpen(Boolean(detail?.open));
    };
    const handleClose = () => {
      setComposerOpen(false);
    };

    window.addEventListener(MOBILE_CHAT_COMPOSER_STATE_EVENT, handleState);
    window.addEventListener(MOBILE_CHAT_COMPOSER_CLOSE_EVENT, handleClose);
    return () => {
      window.removeEventListener(MOBILE_CHAT_COMPOSER_STATE_EVENT, handleState);
      window.removeEventListener(MOBILE_CHAT_COMPOSER_CLOSE_EVENT, handleClose);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(MOBILE_CHAT_COMPOSER_CLOSE_EVENT));
  }, [pathname]);

  useEffect(() => {
    const closeComposerState = () => {
      window.dispatchEvent(new CustomEvent(MOBILE_CHAT_COMPOSER_CLOSE_EVENT));
    };

    window.addEventListener("popstate", closeComposerState);
    return () => {
      window.removeEventListener("popstate", closeComposerState);
    };
  }, []);

  useEffect(() => {
    if (!(sheetOpen && pathname.startsWith("/workspace/flashcards"))) {
      return;
    }
    const controller = new AbortController();
    fetch("/api/flashcards/sets", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { sets?: MobileFlashcardSet[] } | null) => {
        setFlashcardSets((payload?.sets ?? []).slice(0, 12));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname, sheetOpen]);

  useEffect(() => {
    if (!(sheetOpen && pathname.startsWith("/workspace/tasks"))) {
      return;
    }
    const controller = new AbortController();
    fetch("/api/tasks?includeCompleted=false&limit=12", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { tasks?: MobileTask[] } | null) => {
        setMobileTasks(payload?.tasks ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname, sheetOpen]);

  useEffect(() => {
    if (!(sheetOpen && pathname.startsWith("/workspace/files"))) {
      return;
    }
    const workspaceUuid = activeWorkspace?.workspaceId;
    if (!workspaceUuid) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/workspaces/${workspaceUuid}/tree`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { files?: MobileWorkspaceFile[] } | null) => {
        setWorkspaceFiles((payload?.files ?? []).slice(0, 12));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [activeWorkspace?.workspaceId, pathname, sheetOpen]);

  useEffect(() => {
    if (!(dockExpanded && isChatRoute)) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (dockRef.current?.contains(target)) {
        return;
      }
      setDockExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [dockExpanded, isChatRoute]);

  const openChatComposer = (options?: { voice?: boolean }) => {
    window.dispatchEvent(
      new CustomEvent(MOBILE_CHAT_COMPOSER_OPEN_EVENT, {
        detail: { voice: options?.voice ?? false },
      })
    );
  };

  const openSheet = () => {
    setDockExpanded(false);
    setSheetOpen(true);
  };

  const openExpandedDock = () => {
    setDockExpanded(true);
  };

  const shouldRenderDock = !composerOpen;
  const showCompactChatDock =
    shouldRenderDock && isChatRoute && !(dockExpanded || composerOpen);

  const navigateToChat = (slug: string) => {
    setSheetOpen(false);
    router.push(`/workspace/chats/${slug}` as Route);
  };

  const sortedRecentChats = useMemo(
    () =>
      recentChats
        .slice()
        .sort((left, right) =>
          (right.lastMessageAt ?? "").localeCompare(left.lastMessageAt ?? "")
        ),
    [recentChats]
  );

  const sectionShortcuts = (
    <div className="grid grid-cols-5 gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border border-border/45 bg-secondary/25 text-muted-foreground",
              item.isActive && "bg-secondary/80 text-foreground"
            )}
            key={item.label}
            onClick={() => {
              setSheetOpen(false);
              if (!item.isActive) {
                router.push(item.href());
              }
            }}
            type="button"
          >
            <Icon className="size-4" />
            <span className="max-w-full truncate text-[9px] leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  const recentChatList = (
    <div className="space-y-1.5">
      {sortedRecentChats.length > 0 ? (
        sortedRecentChats.slice(0, 8).map((chat) => (
          <button
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              chat.slug === activeChatSlug && "bg-secondary text-foreground"
            )}
            key={chat.slug}
            onClick={() => navigateToChat(chat.slug)}
            type="button"
          >
            <MessageSquare className="size-3.5 shrink-0" />
            <span className="truncate text-sm">{chat.title}</span>
          </button>
        ))
      ) : (
        <p className="px-2.5 py-4 text-muted-foreground text-xs">
          Recent chats will appear here.
        </p>
      )}
    </div>
  );

  const flashcardSetList = (
    <div className="space-y-1.5">
      {flashcardSets.length > 0 ? (
        flashcardSets.slice(0, 8).map((set) => (
          <button
            className="flex h-11 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            key={set.id}
            onClick={() => {
              setSheetOpen(false);
              router.push(`/workspace/flashcards/${set.id}` as Route);
            }}
            type="button"
          >
            <span className="min-w-0 truncate text-sm">{set.title}</span>
            <span className="shrink-0 rounded-md border border-border/50 px-1.5 py-0.5 text-[10px]">
              {(set.dueCount ?? 0) + (set.newCount ?? 0)} ready
            </span>
          </button>
        ))
      ) : (
        <p className="px-2.5 py-4 text-muted-foreground text-xs">
          Mindset sets will appear here.
        </p>
      )}
    </div>
  );

  const taskList = (
    <div className="space-y-1.5">
      {mobileTasks.length > 0 ? (
        mobileTasks.slice(0, 8).map((task) => (
          <button
            className="flex h-11 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            key={task.id}
            onClick={() => {
              setSheetOpen(false);
              router.push(`/workspace/tasks?task=${task.id}` as Route);
            }}
            type="button"
          >
            <span className="min-w-0 truncate text-sm">{task.title}</span>
            <span className="shrink-0 text-[10px]">
              {task.dueAt
                ? new Date(task.dueAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "No date"}
            </span>
          </button>
        ))
      ) : (
        <p className="px-2.5 py-4 text-muted-foreground text-xs">
          Open tasks will appear here.
        </p>
      )}
    </div>
  );

  const workspaceFileList = (
    <div className="space-y-1.5">
      {workspaceFiles.length > 0 ? (
        workspaceFiles.slice(0, 8).map((file) => (
          <button
            className="flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            key={file.id}
            onClick={() => {
              setSheetOpen(false);
              router.push(
                `${filesHref}${filesHref.includes("?") ? "&" : "?"}file=${file.id}` as Route
              );
            }}
            type="button"
          >
            <Files className="size-3.5 shrink-0" />
            <span className="truncate text-sm">{file.name}</span>
          </button>
        ))
      ) : (
        <p className="px-2.5 py-4 text-muted-foreground text-xs">
          Workspace files will appear here.
        </p>
      )}
    </div>
  );

  const closeSheetThen = (action: () => void) => {
    setSheetOpen(false);
    requestAnimationFrame(action);
  };

  const contextualActions = (
    <div className="grid grid-cols-2 gap-2">
      <button
        className="flex h-12 items-center gap-2 rounded-xl border border-border/45 bg-secondary/25 px-3 text-left text-muted-foreground"
        onClick={() =>
          closeSheetThen(() =>
            commandPaletteActions.open({
              scope: activeItem?.label === "Workspace" ? "files" : "all",
            })
          )
        }
        type="button"
      >
        <MagnifyingGlass className="size-4 shrink-0" />
        <span className="truncate text-sm">Search</span>
      </button>
      <button
        className="flex h-12 items-center gap-2 rounded-xl border border-border/45 bg-secondary/25 px-3 text-left text-muted-foreground"
        onClick={() => closeSheetThen(() => setSettingsOpen(true))}
        type="button"
      >
        <Gear className="size-4 shrink-0" />
        <span className="truncate text-sm">Settings</span>
      </button>
      {pathname.startsWith("/workspace/tasks") ? (
        <button
          className="flex h-12 items-center gap-2 rounded-xl border border-border/45 bg-secondary/25 px-3 text-left text-muted-foreground"
          onClick={() => closeSheetThen(() => quickCaptureActions.open("task"))}
          type="button"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate text-sm">New task</span>
        </button>
      ) : null}
      {pathname.startsWith("/workspace/flashcards") ? (
        <button
          className="flex h-12 items-center gap-2 rounded-xl border border-border/45 bg-secondary/25 px-3 text-left text-muted-foreground"
          onClick={() =>
            closeSheetThen(() =>
              router.push("/workspace/flashcards?create=1" as Route)
            )
          }
          type="button"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate text-sm">New set</span>
        </button>
      ) : null}
      {pathname.startsWith("/workspace/files") ? (
        <button
          className="flex h-12 items-center gap-2 rounded-xl border border-border/45 bg-secondary/25 px-3 text-left text-muted-foreground"
          onClick={() => closeSheetThen(() => setTrashOpen(true))}
          type="button"
        >
          <Trash className="size-4 shrink-0" />
          <span className="truncate text-sm">Trash</span>
        </button>
      ) : null}
      {isChatRoute ? (
        <button
          className="flex h-12 items-center gap-2 rounded-xl border border-border/45 bg-secondary/25 px-3 text-left text-muted-foreground"
          onClick={() =>
            closeSheetThen(() => router.push(createFreshNewChatHref()))
          }
          type="button"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate text-sm">New chat</span>
        </button>
      ) : null}
    </div>
  );

  const contextualList = (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="font-medium text-foreground text-sm">
          {isChatRoute
            ? "Recent chats"
            : pathname.startsWith("/workspace/flashcards")
              ? "Learn"
              : pathname.startsWith("/workspace/tasks")
                ? "Tasks"
                : pathname.startsWith("/workspace/files")
                  ? "Workspace"
                  : "Shortcuts"}
        </p>
      </div>
      {isChatRoute ? (
        recentChatList
      ) : pathname.startsWith("/workspace/flashcards") ? (
        flashcardSetList
      ) : pathname.startsWith("/workspace/tasks") ? (
        taskList
      ) : pathname.startsWith("/workspace/files") ? (
        workspaceFileList
      ) : (
        <div className="space-y-1.5">
          {items
            .filter((item) => !item.isActive)
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className="flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  key={item.label}
                  onClick={() => {
                    setSheetOpen(false);
                    router.push(item.href());
                  }}
                  type="button"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate text-sm">{item.label}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );

  const sheetBody = (
    <div className="max-h-[min(62vh,32rem)] space-y-4 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {sectionShortcuts}
      {contextualActions}
      {contextualList}
    </div>
  );

  return (
    <>
      {shouldRenderDock ? (
        <nav
          aria-label="Workspace sections"
          className="fixed inset-x-0 bottom-[calc(0.35rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:hidden"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {showCompactChatDock ? (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="grid h-12 w-full grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2"
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                key="compact-chat-dock"
                layoutId="mobile-workspace-dock"
                transition={{ ...springs.moderate, bounce: 0 }}
              >
                <motion.div layoutId="mobile-workspace-dock-menu">
                  <Button
                    aria-label="Open navigation"
                    className="h-12 w-12 rounded-full border border-border/55 bg-background/92 p-0 text-muted-foreground shadow-[0_12px_34px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl hover:bg-secondary/80 hover:text-foreground"
                    onClick={openExpandedDock}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <DotsThree className="size-5" weight="bold" />
                  </Button>
                </motion.div>
                <motion.button
                  className="flex h-12 min-w-0 items-center justify-center rounded-full border border-border/45 bg-background/92 px-4 font-medium text-[15px] text-foreground shadow-[0_12px_34px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-colors hover:bg-secondary/70"
                  layoutId="mobile-workspace-dock-title"
                  onClick={() => openChatComposer()}
                  type="button"
                >
                  <span className="truncate">{activeChatTitle}</span>
                </motion.button>
                <motion.div layoutId="mobile-workspace-dock-action">
                  <Button
                    aria-label="Open chat menu"
                    className="h-12 w-12 rounded-full border border-border/55 bg-background/92 p-0 text-muted-foreground shadow-[0_12px_34px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl hover:bg-secondary/80 hover:text-foreground"
                    onClick={() => openChatComposer({ voice: true })}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Waveform className="size-5" />
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="grid h-[3.2rem] w-full grid-cols-5 items-center gap-1 rounded-full border border-border/55 bg-background/95 px-1.5 shadow-[0_12px_38px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl dark:bg-background/90"
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                key="expanded-dock"
                layoutId="mobile-workspace-dock"
                ref={dockRef}
                transition={{ ...springs.moderate, bounce: 0 }}
                {...proximityHandlers}
              >
                {items.map((item, index) => {
                  const Icon = item.icon;
                  const isNear = proximityIndex === index;
                  return (
                    <motion.div
                      animate={{
                        y: isNear ? -1 : 0,
                      }}
                      className="relative z-10"
                      key={item.label}
                      layoutId={
                        item.label === "Chat"
                          ? "mobile-workspace-dock-action"
                          : undefined
                      }
                      ref={(node) => registerItem(index, node)}
                      transition={springs.fast}
                    >
                      <Button
                        aria-current={item.isActive ? "page" : undefined}
                        aria-label={item.label}
                        className={cn(
                          "flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-full border border-transparent bg-transparent p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
                          item.isActive &&
                            "border-border/50 bg-secondary/75 text-foreground shadow-none",
                          isNear && !item.isActive && "text-foreground"
                        )}
                        onClick={() => {
                          if (item.isActive) {
                            setSheetOpen(true);
                            setDockExpanded(false);
                            return;
                          }
                          router.push(item.href());
                        }}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Icon className="size-4" />
                        <span className="max-w-full truncate text-[9px] leading-none">
                          {item.label}
                        </span>
                      </Button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      ) : null}
      <Drawer onOpenChange={setSheetOpen} open={sheetOpen}>
        <DrawerContent className="md:hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle>{activeItem?.label ?? "Workspace"}</DrawerTitle>
            <DrawerDescription className="sr-only">
              Workspace navigation
            </DrawerDescription>
          </DrawerHeader>
          {sheetBody}
        </DrawerContent>
      </Drawer>
    </>
  );
}
