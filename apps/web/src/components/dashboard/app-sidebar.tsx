"use client";

import { Button } from "@avenire/ui/components/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { ExpandableTabs } from "@avenire/ui/components/expandable-tabs";
import { Input } from "@avenire/ui/components/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avenire/ui/components/sidebar";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@avenire/ui/components/tooltip";
import { cn } from "@avenire/ui/lib/utils";
import {
  Columns,
  Files,
  GitBranch,
  ListChecks,
  MagnifyingGlass,
  Chat as MessageSquare,
  DotsThree as MoreHorizontal,
  SidebarSimpleIcon as PanelLeftIcon,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  Plus,
  PlusCircle,
  Gear as Settings,
  Sparkle as Sparkles,
  Trash as Trash2,
  Waves,
} from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatIcon } from "@/components/chat/chat-icon";
import { useHaptics } from "@/hooks/use-haptics";
import type { ChatSummary } from "@/lib/chat-data";
import {
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
} from "@/lib/chat-events";
import { isChatIconName } from "@/lib/chat-icons";
import {
  readCachedChats,
  readCachedWorkspaces,
  writeCachedChats,
  writeCachedWorkspaces,
} from "@/lib/dashboard-browser-cache";
import {
  warmDashboardBackground,
  warmWorkspaceSurface,
} from "@/lib/dashboard-warmup";
import {
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
} from "@/lib/task-client-store";
import {
  setWorkspacePaneDragData,
  useWorkspaceSurfaceNavigation,
} from "@/lib/workspace-panes";
import { commandPaletteActions } from "@/stores/commandPaletteStore";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";
import { useFilesPinsStore } from "@/stores/filesPinsStore";
import { filesUiActions } from "@/stores/filesUiStore";

const FlashcardsSidebarPanel = dynamic(
  () =>
    import("@/components/flashcards/sidebar-panel").then((module) => ({
      default: module.FlashcardsSidebarPanel,
    })),
  {
    loading: () => (
      <div className="absolute inset-0 flex items-start p-4">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          <Spinner className="size-3.5" />
          Loading flashcards...
        </div>
      </div>
    ),
  }
);

const DeferredFilesSidebarPanel = dynamic(
  () =>
    import("@/components/dashboard/sidebar-files-panel").then((module) => ({
      default: module.FilesSidebarPanel,
    })),
  {
    loading: () => (
      <div className="absolute inset-0 flex items-start p-4">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          <Spinner className="size-3.5" />
          Loading files...
        </div>
      </div>
    ),
  }
);

function isChatSummary(value: unknown): value is ChatSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChatSummary>;
  return (
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.lastMessageAt === "string"
  );
}

function createOptimisticChatSummary(input: {
  detail: ChatNameUpdatedDetail;
  workspaceUuid: string;
}): ChatSummary {
  const now = new Date().toISOString();
  return {
    branching: null,
    createdAt: now,
    icon: input.detail.icon ?? null,
    id: `optimistic:${input.detail.id}`,
    lastMessageAt: now,
    pinned: false,
    slug: input.detail.id,
    title: input.detail.name,
    updatedAt: now,
    workspaceId: input.workspaceUuid,
  };
}

function applyChatRealtimeEvent(
  chats: ChatSummary[],
  payload: {
    action?: string | null;
    chat?: unknown;
    chatSlug?: string | null;
  } | null
) {
  if (!payload?.action) {
    return null;
  }

  if (payload.action === "deleted" && payload.chatSlug) {
    return chats.filter((chat) => chat.slug !== payload.chatSlug);
  }

  if (
    (payload.action === "created" || payload.action === "updated") &&
    isChatSummary(payload.chat)
  ) {
    const nextChat = payload.chat;
    const existingIndex = chats.findIndex(
      (chat) => chat.slug === nextChat.slug
    );
    if (existingIndex === -1) {
      return [nextChat, ...chats];
    }

    return chats.map((chat) => (chat.slug === nextChat.slug ? nextChat : chat));
  }

  return null;
}

const DeferredNavUser = dynamic(
  () =>
    import("@/components/dashboard/nav-user").then((module) => ({
      default: module.NavUser,
    })),
  { loading: () => <div className="h-14" /> }
);

const DeferredSidebarTaskPreview = dynamic(
  () =>
    import("@/components/dashboard/sidebar-task-preview").then((module) => ({
      default: module.SidebarTaskPreview,
    })),
  {
    loading: () => (
      <div className="absolute inset-0 overflow-y-auto px-4 py-4 text-muted-foreground text-xs">
        Loading tasks...
      </div>
    ),
  }
);

interface DashboardSidebarUser {
  avatar?: string;
  email: string;
  name: string;
}

async function sendChatSessionClose(payload: {
  chatId: string;
  sessionId: string;
}) {
  const body = JSON.stringify({
    kind: "session-close",
    chatId: payload.chatId,
    sessionId: payload.sessionId,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/chat",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  await fetch("/api/chat", {
    body,
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function SectionButton({
  contextMenuContent,
  dragHref,
  icon: Icon,
  description,
  label,
  size = "default",
  onClick,
  onContextMenu: _onContextMenu,
}: {
  contextMenuContent?: ReactNode;
  dragHref?: Route;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  label: string;
  size?: "default" | "lg";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const button = (
    <SidebarMenuButton
      draggable={Boolean(dragHref)}
      onClick={onClick}
      onContextMenu={_onContextMenu}
      onDragStart={(event) => {
        if (!dragHref) {
          return;
        }

        setWorkspacePaneDragData(event.dataTransfer, dragHref);
      }}
      size={size}
    >
      <Icon className="size-3.5" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[11px]">{label}</p>
        {description ? (
          <p className="truncate text-[10px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </SidebarMenuButton>
  );

  if (contextMenuContent) {
    return (
      <SidebarMenuItem>
        <ContextMenu>
          <ContextMenuTrigger render={<div className="contents" />}>
            {button}
          </ContextMenuTrigger>
          <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
        </ContextMenu>
      </SidebarMenuItem>
    );
  }

  return <SidebarMenuItem>{button}</SidebarMenuItem>;
}

function SidebarEmptyState({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Empty className="min-h-[7.5rem] rounded-2xl border-border/50 bg-background/60 px-3 py-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="size-4" />
        </EmptyMedia>
        <EmptyTitle className="text-xs">{title}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent className="max-w-none">
        <EmptyDescription className="text-[11px] leading-relaxed">
          {description}
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}

function SectionHeader({
  actions,
  title,
}: {
  actions?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      {actions ? (
        <div className="flex items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}

function SectionIconAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

const DASHBOARD_FLASHCARDS_ROUTE_REGEX = /^\/workspace\/flashcards\/([^/?#]+)/;
const DASHBOARD_FILES_FOLDER_ROUTE_REGEX =
  /^\/workspace\/files\/[^/]+\/folder\/([^/?#]+)/;

function createFreshNewChatHref() {
  return `/workspace/chats/new?fresh=${Date.now().toString(36)}` as Route;
}

function getChatDateGroup(chat: ChatSummary) {
  const updated = new Date(chat.updatedAt || chat.lastMessageAt);
  if (Number.isNaN(updated.getTime())) {
    return "Older";
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const previous7 = new Date(startOfToday);
  previous7.setDate(previous7.getDate() - 7);
  const previous30 = new Date(startOfToday);
  previous30.setDate(previous30.getDate() - 30);

  if (updated >= startOfToday) {
    return "Today";
  }
  if (updated >= startOfYesterday) {
    return "Yesterday";
  }
  if (updated >= previous7) {
    return "Previous 7 days";
  }
  if (updated >= previous30) {
    return "Previous 30 days";
  }
  return "Older";
}

function ChatListSection({
  activeChatSlug,
  editingChatSlug,
  editingTitle,
  onEditingTitleChange,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onSelect,
  onSelectInNewPane,
  onSelectInNewTab,
  onTogglePin,
  onDelete,
  pendingChatSlug,
  pinnedChats,
  otherChats,
}: {
  activeChatSlug: string;
  editingChatSlug: string | null;
  editingTitle: string;
  onEditingTitleChange: (value: string) => void;
  onStartRename: (chat: ChatSummary) => void;
  onFinishRename: (chatSlug: string) => void;
  onCancelRename: () => void;
  onSelect: (chatSlug: string) => void;
  onSelectInNewPane?: (chatSlug: string) => void;
  onSelectInNewTab?: (chatSlug: string) => void;
  onTogglePin: (chatSlug: string, pinned: boolean) => void;
  onDelete: (chatSlug: string) => void;
  pendingChatSlug: string | null;
  pinnedChats: ChatSummary[];
  otherChats: ChatSummary[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo<
    Array<
      | { key: string; type: "header"; title: string }
      | { chat: ChatSummary; key: string; type: "chat" }
    >
  >(() => {
    const nextRows: Array<
      | { key: string; type: "header"; title: string }
      | { chat: ChatSummary; key: string; type: "chat" }
    > = [];

    if (pinnedChats.length > 0) {
      nextRows.push({
        key: "header-pinned",
        title: "Pinned Chats",
        type: "header",
      });
      for (const chat of pinnedChats) {
        nextRows.push({ chat, key: `chat-${chat.slug}`, type: "chat" });
      }
    }

    const otherChatsByDate = new Map<string, ChatSummary[]>();
    for (const chat of otherChats) {
      const group = getChatDateGroup(chat);
      otherChatsByDate.set(group, [
        ...(otherChatsByDate.get(group) ?? []),
        chat,
      ]);
    }

    for (const title of [
      "Today",
      "Yesterday",
      "Previous 7 days",
      "Previous 30 days",
      "Older",
    ]) {
      const chats = otherChatsByDate.get(title) ?? [];
      if (chats.length === 0) {
        continue;
      }
      nextRows.push({
        key: `header-${title.toLowerCase().replaceAll(" ", "-")}`,
        title,
        type: "header",
      });
      for (const chat of chats) {
        nextRows.push({ chat, key: `chat-${chat.slug}`, type: "chat" });
      }
    }

    return nextRows;
  }, [otherChats, pinnedChats]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: (index) => (rows[index]?.type === "header" ? 32 : 38),
    getScrollElement: () => scrollRef.current,
    measureElement,
    overscan: 8,
  });

  if (pinnedChats.length === 0 && otherChats.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarEmptyState
            description="New chats will appear here once you start a conversation."
            icon={MessageSquare}
            title="No chats yet"
          />
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto px-2 pb-2" ref={scrollRef}>
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row = rows[virtualItem.index];
            if (!row) {
              return null;
            }

            return (
              <div
                data-index={virtualItem.index}
                key={virtualItem.key}
                ref={virtualizer.measureElement}
                style={{
                  left: 0,
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualItem.start}px)`,
                  width: "100%",
                }}
              >
                {row.type === "header" ? (
                  <div className="px-2 pt-2 pb-1">
                    <SidebarGroupLabel>{row.title}</SidebarGroupLabel>
                  </div>
                ) : (
                  <SidebarMenu>
                    <ChatListItem
                      activeChatSlug={activeChatSlug}
                      chat={row.chat}
                      editingChatSlug={editingChatSlug}
                      editingTitle={editingTitle}
                      onCancelRename={onCancelRename}
                      onDelete={onDelete}
                      onEditingTitleChange={onEditingTitleChange}
                      onFinishRename={onFinishRename}
                      onSelect={onSelect}
                      onSelectInNewPane={onSelectInNewPane}
                      onSelectInNewTab={onSelectInNewTab}
                      onStartRename={onStartRename}
                      onTogglePin={onTogglePin}
                      pendingChatSlug={pendingChatSlug}
                    />
                  </SidebarMenu>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChatListItem({
  activeChatSlug,
  chat,
  editingChatSlug,
  editingTitle,
  pendingChatSlug,
  onEditingTitleChange,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onSelect,
  onSelectInNewPane,
  onSelectInNewTab,
  onTogglePin,
  onDelete,
}: {
  activeChatSlug: string;
  chat: ChatSummary;
  editingChatSlug: string | null;
  editingTitle: string;
  pendingChatSlug: string | null;
  onEditingTitleChange: (value: string) => void;
  onStartRename: (chat: ChatSummary) => void;
  onFinishRename: (chatSlug: string) => void;
  onCancelRename: () => void;
  onSelect: (chatSlug: string) => void;
  onSelectInNewPane?: (chatSlug: string) => void;
  onSelectInNewTab?: (chatSlug: string) => void;
  onTogglePin: (chatSlug: string, pinned: boolean) => void;
  onDelete: (chatSlug: string) => void;
}) {
  const isEditing = editingChatSlug === chat.slug;
  const isPending = pendingChatSlug === chat.slug;
  const iconName = isChatIconName(chat.icon) ? chat.icon : null;

  const button = (
    <SidebarMenuButton
      draggable
      isActive={activeChatSlug === chat.slug}
      onClick={(event) => {
        if (event.ctrlKey && event.shiftKey) {
          event.preventDefault();
          onSelectInNewTab?.(chat.slug);
          return;
        }
        if (event.altKey) {
          event.preventDefault();
          onSelectInNewPane?.(chat.slug);
          return;
        }
        onSelect(chat.slug);
      }}
      onDragStart={(event) => {
        setWorkspacePaneDragData(
          event.dataTransfer,
          `/workspace/chats/${chat.slug}` as Route
        );
      }}
    >
      {chat.branching ? <GitBranch className="size-4" /> : null}
      {isPending ? (
        <Spinner className="size-4 text-foreground/80" />
      ) : iconName ? (
        <ChatIcon className="text-muted-foreground" name={iconName} />
      ) : null}
      <Tooltip>
        <TooltipTrigger render={<span className="truncate" />}>
          {chat.title}
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="max-w-72 break-words">{chat.title}</span>
        </TooltipContent>
      </Tooltip>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem key={chat.slug}>
      {isEditing ? (
        <form
          className="px-2"
          onSubmit={(event) => {
            event.preventDefault();
            onFinishRename(chat.slug);
          }}
        >
          <Input
            autoFocus
            className="h-7 text-xs"
            onBlur={() => onFinishRename(chat.slug)}
            onChange={(event) => onEditingTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelRename();
              }
            }}
            value={editingTitle}
          />
        </form>
      ) : (
        <>
          <ContextMenu>
            <ContextMenuTrigger render={<div className="contents" />}>
              {button}
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(chat.slug);
                }}
              >
                <MessageSquare className="mr-2 size-3.5" />
                Open
              </ContextMenuItem>
              <ContextMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectInNewPane?.(chat.slug);
                }}
              >
                <Columns className="mr-2 size-3.5" />
                Open in new pane
              </ContextMenuItem>
              <ContextMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectInNewTab?.(chat.slug);
                }}
              >
                <Plus className="mr-2 size-3.5" />
                Open in new tab
              </ContextMenuItem>
              {chat.readOnly ? null : (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onStartRename(chat);
                    }}
                  >
                    <Pencil className="mr-2 size-3.5" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(chat.slug, !chat.pinned);
                    }}
                  >
                    {chat.pinned ? (
                      <PinOff className="mr-2 size-3.5" />
                    ) : (
                      <Pin className="mr-2 size-3.5" />
                    )}
                    {chat.pinned ? "Unpin" : "Pin"}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(chat.slug);
                    }}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    Delete
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>

          {chat.readOnly ? null : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    onClick={(event) => event.stopPropagation()}
                    showOnHover
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartRename(chat);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePin(chat.slug, !chat.pinned);
                  }}
                >
                  {chat.pinned ? (
                    <>
                      <PinOff className="size-3.5" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="size-3.5" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(chat.slug);
                  }}
                  variant="destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </SidebarMenuItem>
  );
}

async function parseResponse<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

function readPreferredWorkspaceId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("preferredWorkspaceId");
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (tagName !== "input") {
    return false;
  }

  const input = target as HTMLInputElement;
  const ignoredInputTypes = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ]);

  return !ignoredInputTypes.has(input.type.toLowerCase());
}

export function DashboardSidebar({
  user,
  activeWorkspace,
  initialWorkspaces = [],
  initialChats = [],
  activeChatSlug: activeChatSlugProp,
  className,
  style,
  ...props
}: ComponentProps<typeof Sidebar> & {
  activeWorkspace?: {
    name?: string;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  user?: DashboardSidebarUser;
  initialWorkspaces?: Array<{
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
  initialChats?: ChatSummary[];
  activeChatSlug?: string;
}) {
  const router = useRouter();
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const { navigate } = useWorkspaceSurfaceNavigation({
    panesEnabled: !isMobile,
  });
  const triggerHaptic = useHaptics();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatSummary[]>(
    () =>
      (activeWorkspace?.workspaceId
        ? readCachedChats(activeWorkspace.workspaceId)
        : null) ?? initialChats
  );
  const [editingChatSlug, setEditingChatSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [pendingChatSlug, setPendingChatSlug] = useState<string | null>(null);
  const [workspaceUuid, setWorkspaceUuid] = useState<string | null>(
    activeWorkspace?.workspaceId ?? null
  );
  const [workspaces, setWorkspaces] = useState<
    Array<{
      workspaceId: string;
      organizationId: string;
      rootFolderId: string;
      name: string;
    }>
  >(() => readCachedWorkspaces() ?? initialWorkspaces);
  const [invitations, setInvitations] = useState<
    Array<{
      id: string;
      organizationId: string;
      organizationName: string;
      inviterName: string | null;
      inviterEmail: string;
    }>
  >([]);
  const _settingsOpen = useDashboardOverlayStore((state) => state.settingsOpen);
  const setSettingsOpen = useDashboardOverlayStore(
    (state) => state.setSettingsOpen
  );
  const _trashOpen = useDashboardOverlayStore((state) => state.trashOpen);
  const setTrashOpen = useDashboardOverlayStore((state) => state.setTrashOpen);
  const isChatsRoute =
    pathname === "/workspace/chats" || pathname.startsWith("/workspace/chats/");
  const activeChatSlugFromPath = useMemo(() => {
    const match = pathname.match(/^\/workspace\/chats\/([^/?#]+)/);
    if (!match?.[1] || match[1] === "new") {
      return "";
    }
    return match[1];
  }, [pathname]);
  const activeChatSlug = activeChatSlugFromPath || activeChatSlugProp || "";
  const chatsWorkspaceRef = useRef<string | null>(
    activeWorkspace?.workspaceId ?? null
  );
  const sessionCloseRef = useRef<{
    chatId: string;
    sent: boolean;
    sessionId: string;
  } | null>(null);
  const sessionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  let routeView:
    | "chat"
    | "flashcards"
    | "files"
    | "tasks"
    | "workspace"
    | null = null;
  if (pathname.startsWith("/workspace/flashcards")) {
    routeView = "flashcards";
  } else if (pathname.startsWith("/workspace/tasks")) {
    routeView = "tasks";
  } else if (pathname.startsWith("/workspace/files")) {
    routeView = "files";
  } else if (isChatsRoute) {
    routeView = "chat";
  } else if (pathname === "/workspace") {
    routeView = "workspace";
  }
  const activeView = routeView;
  const [desktopSidebarView, setDesktopSidebarView] = useState<
    "chat" | "flashcards" | "files" | "tasks" | "workspace"
  >(() => routeView ?? "workspace");
  const [mobileSidebarView, setMobileSidebarView] = useState<
    "chat" | "flashcards" | "files" | "tasks" | "workspace"
  >(() => routeView ?? "workspace");
  const [peekHovered, setPeekHovered] = useState(false);
  const peekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarView = isMobile ? mobileSidebarView : desktopSidebarView;
  const activeTabValue = sidebarView === "workspace" ? null : sidebarView;
  const [mountedViews, setMountedViews] = useState<
    Set<"chat" | "flashcards" | "files" | "tasks">
  >(() =>
    sidebarView && sidebarView !== "workspace"
      ? new Set([sidebarView])
      : new Set()
  );
  const [deferredStartupReady, setDeferredStartupReady] = useState(false);
  const primaryChatRoute = useMemo<Route>(() => {
    const chatSlug = activeChatSlug || chats[0]?.slug;
    return chatSlug
      ? (`/workspace/chats/${chatSlug}` as Route)
      : ("/workspace/chats" as Route);
  }, [activeChatSlug, chats]);
  const primaryFilesRoute = useMemo<Route>(() => {
    const activeWorkspaceSummary =
      (workspaceUuid
        ? workspaces.find(
            (workspace) => workspace.workspaceId === workspaceUuid
          )
        : undefined) ??
      (activeWorkspace
        ? {
            name: "Workspace",
            organizationId: undefined,
            rootFolderId: activeWorkspace.rootFolderId,
            workspaceId: activeWorkspace.workspaceId,
          }
        : undefined) ??
      workspaces[0];

    return activeWorkspaceSummary
      ? (`/workspace/files/${activeWorkspaceSummary.workspaceId}/folder/${activeWorkspaceSummary.rootFolderId}` as Route)
      : ("/workspace/files" as Route);
  }, [activeWorkspace, workspaceUuid, workspaces]);
  const isPeekabooActive = !isMobile && state === "collapsed" && peekHovered;

  useEffect(() => {
    if (!isMobile && state !== "collapsed") {
      setPeekHovered(false);
    }
  }, [isMobile, state]);

  useEffect(() => {
    return () => {
      if (peekCloseTimerRef.current) {
        clearTimeout(peekCloseTimerRef.current);
        peekCloseTimerRef.current = null;
      }
    };
  }, []);

  const openPeekSidebar = useCallback(() => {
    if (state !== "collapsed") {
      return;
    }

    if (peekCloseTimerRef.current) {
      clearTimeout(peekCloseTimerRef.current);
      peekCloseTimerRef.current = null;
    }

    setPeekHovered(true);
  }, [state]);

  const closePeekSidebar = useCallback(() => {
    if (state !== "collapsed") {
      return;
    }

    if (peekCloseTimerRef.current) {
      clearTimeout(peekCloseTimerRef.current);
    }

    peekCloseTimerRef.current = setTimeout(() => {
      setPeekHovered(false);
      peekCloseTimerRef.current = null;
    }, 90);
  }, [state]);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      return;
    }

    primeWorkspaceTaskStore(activeWorkspace.workspaceId);
    void reloadWorkspaceTasks(activeWorkspace.workspaceId, {
      background: true,
    });
  }, [activeWorkspace?.workspaceId]);
  const closeMobileSidebar = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);
  const openOverlayAfterCollapse = useCallback(
    (openOverlay: () => void) => {
      if (!isMobile) {
        openOverlay();
        return;
      }

      closeMobileSidebar();
      requestAnimationFrame(() => {
        requestAnimationFrame(openOverlay);
      });
    },
    [closeMobileSidebar, isMobile]
  );
  const currentFlashcardSetId = useMemo(() => {
    const match = pathname.match(DASHBOARD_FLASHCARDS_ROUTE_REGEX);
    return match?.[1] ?? undefined;
  }, [pathname]);
  const currentFolderId = useMemo(() => {
    const match = pathname.match(DASHBOARD_FILES_FOLDER_ROUTE_REGEX);
    return match?.[1] ?? undefined;
  }, [pathname]);
  const currentFileId = searchParams.get("file") ?? undefined;
  const routeWorkspaceUuid = useMemo(() => {
    const match = pathname.match(/^\/workspace\/files\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);
  const preferredWorkspaceId = readPreferredWorkspaceId();
  const activeChatWorkspaceId = activeChatSlug
    ? (chats.find((chat) => chat.slug === activeChatSlug)?.workspaceId ?? null)
    : null;

  const derivedWorkspaceUuid =
    routeWorkspaceUuid ??
    activeWorkspace?.workspaceId ??
    preferredWorkspaceId ??
    activeChatWorkspaceId ??
    workspaces[0]?.workspaceId ??
    null;

  const warmWorkspaceSection = useCallback(
    (section: "chat" | "flashcards" | "files" | "tasks") => {
      if (section === "chat") {
        router.prefetch(primaryChatRoute);
        warmWorkspaceSurface("chat", {
          rootFolderId: activeWorkspace?.rootFolderId ?? null,
          workspaceUuid,
        }).catch(() => undefined);
        return;
      }

      if (section === "flashcards") {
        router.prefetch("/workspace/flashcards" as Route);
        import("@/components/flashcards/sidebar-panel").catch(() => undefined);
        warmWorkspaceSurface("flashcards", {
          rootFolderId: activeWorkspace?.rootFolderId ?? null,
          workspaceUuid,
        }).catch(() => undefined);
        return;
      }

      if (section === "tasks") {
        router.prefetch("/workspace/tasks" as Route);
        return;
      }

      router.prefetch(primaryFilesRoute);
      import("@/components/dashboard/sidebar-files-panel").catch(
        () => undefined
      );
      warmWorkspaceSurface("files", {
        currentFolderId,
        rootFolderId: activeWorkspace?.rootFolderId ?? null,
        workspaceUuid,
      }).catch(() => undefined);
    },
    [
      activeWorkspace?.rootFolderId,
      currentFolderId,
      primaryChatRoute,
      primaryFilesRoute,
      router,
      workspaceUuid,
    ]
  );

  useEffect(() => {
    if (
      !sidebarView ||
      sidebarView === "workspace" ||
      mountedViews.has(sidebarView)
    ) {
      return;
    }

    setMountedViews((previous) => {
      if (previous.has(sidebarView)) {
        return previous;
      }

      const next = new Set(previous);
      next.add(sidebarView);
      return next;
    });
  }, [mountedViews, sidebarView]);

  useEffect(() => {
    if (initialChats.length === 0) {
      return;
    }
    setChats((prev) => {
      if (prev === initialChats) {
        return prev;
      }
      if (
        prev.length === initialChats.length &&
        prev.every((chat, i) => chat.id === initialChats[i]?.id)
      ) {
        return prev;
      }
      return initialChats;
    });
  }, [initialChats]);

  useEffect(() => {
    setWorkspaceUuid((prev) =>
      prev === derivedWorkspaceUuid ? prev : derivedWorkspaceUuid
    );
  }, [derivedWorkspaceUuid]);

  useEffect(() => {
    if (chatsWorkspaceRef.current === workspaceUuid) {
      return;
    }
    chatsWorkspaceRef.current = workspaceUuid;
    const cachedChats = workspaceUuid ? readCachedChats(workspaceUuid) : null;
    setChats(cachedChats ?? []);
  }, [workspaceUuid]);

  useEffect(() => {
    const clearSessionCloseTimer = () => {
      if (sessionCloseTimerRef.current) {
        clearTimeout(sessionCloseTimerRef.current);
        sessionCloseTimerRef.current = null;
      }
    };

    const startSessionCloseTimer = () => {
      if (sessionCloseRef.current?.sent || !sessionCloseRef.current?.chatId) {
        return;
      }
      if (sessionCloseTimerRef.current) {
        return;
      }

      sessionCloseTimerRef.current = setTimeout(
        () => {
          const scope = sessionCloseRef.current;
          sessionCloseTimerRef.current = null;
          if (!scope || scope.sent || !scope.chatId) {
            return;
          }
          scope.sent = true;
          void sendChatSessionClose({
            chatId: scope.chatId,
            sessionId: scope.sessionId,
          }).catch(() => undefined);
        },
        5 * 60 * 1000
      );
    };

    const updateSessionScope = () => {
      const nextChatId = activeChatSlug || "";
      if (!nextChatId || nextChatId === "new") {
        if (routeView === "chat") {
          sessionCloseRef.current = null;
        }
        return;
      }

      if (sessionCloseRef.current?.chatId !== nextChatId) {
        sessionCloseRef.current = {
          chatId: nextChatId,
          sent: false,
          sessionId:
            globalThis.crypto?.randomUUID?.() ??
            `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        };
      }
    };

    const sendCloseNow = () => {
      const scope = sessionCloseRef.current;
      if (!scope || scope.sent || !scope.chatId) {
        return;
      }
      scope.sent = true;
      const payload = JSON.stringify({
        kind: "session-close",
        chatId: scope.chatId,
        sessionId: scope.sessionId,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/chat",
          new Blob([payload], { type: "application/json" })
        );
        return;
      }

      void fetch("/api/chat", {
        body: payload,
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }).catch(() => undefined);
    };

    updateSessionScope();

    if (routeView === "chat") {
      clearSessionCloseTimer();
    } else if (sessionCloseRef.current?.chatId) {
      startSessionCloseTimer();
    }

    const handlePageHide = () => {
      clearSessionCloseTimer();
      sendCloseNow();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (routeView === "chat") {
          return;
        }
        startSessionCloseTimer();
        return;
      }

      clearSessionCloseTimer();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearSessionCloseTimer();
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeChatSlug, routeView]);

  const loadChats = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/history", {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { chats?: ChatSummary[] };
      const nextChats = payload.chats ?? [];
      setChats(nextChats);
      if (workspaceUuid && chatsWorkspaceRef.current === workspaceUuid) {
        writeCachedChats(workspaceUuid, nextChats);
      }
    } catch {
      // ignore
    }
  }, [workspaceUuid]);

  useEffect(() => {
    if (!(deferredStartupReady || activeView === "chat" || isChatsRoute)) {
      return;
    }
    loadChats().catch(() => undefined);
  }, [activeView, deferredStartupReady, isChatsRoute, loadChats]);

  useEffect(() => {
    if (deferredStartupReady || typeof window === "undefined") {
      return;
    }

    const markReady = () => {
      setDeferredStartupReady(true);
    };

    const cleanupListeners = () => {
      window.removeEventListener("pointerdown", markReady);
      window.removeEventListener("keydown", markReady);
      window.removeEventListener("focusin", markReady);
    };

    window.addEventListener("pointerdown", markReady, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", markReady, { once: true });
    window.addEventListener("focusin", markReady, { once: true });

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        markReady();
      });
      return () => {
        cleanupListeners();
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(markReady, 2000);
    return () => {
      cleanupListeners();
      globalThis.clearTimeout(timeoutId);
    };
  }, [deferredStartupReady]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    if (chatsWorkspaceRef.current !== workspaceUuid) {
      return;
    }
    writeCachedChats(workspaceUuid, chats);
  }, [chats, workspaceUuid]);

  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }

    const warmTargets = () => {
      router.prefetch(primaryChatRoute);
      router.prefetch("/workspace/flashcards" as Route);
      router.prefetch(primaryFilesRoute);
      import("@/components/dashboard/sidebar-files-panel").catch(
        () => undefined
      );
      import("@/components/flashcards/sidebar-panel").catch(() => undefined);
      import("@/components/settings/settings-dialog").catch(() => undefined);
      import("@/components/dashboard/task-manager").catch(() => undefined);
      import("@/components/student-calendar").catch(() => undefined);
      warmDashboardBackground({
        currentFolderId,
        rootFolderId: activeWorkspace?.rootFolderId ?? null,
        workspaceUuid,
      }).catch(() => undefined);
    };

    if (typeof window === "undefined") {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        warmTargets();
      });
      return () => {
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = setTimeout(warmTargets, 150);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    activeWorkspace?.rootFolderId,
    currentFolderId,
    deferredStartupReady,
    primaryChatRoute,
    primaryFilesRoute,
    router,
    workspaceUuid,
  ]);

  const pinsRehydratedRef = useRef(false);
  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }
    if (!pinsRehydratedRef.current) {
      pinsRehydratedRef.current = true;
      useFilesPinsStore.persist.rehydrate();
    }
  }, [deferredStartupReady]);

  useEffect(() => {
    if (
      routeWorkspaceUuid &&
      readPreferredWorkspaceId() !== routeWorkspaceUuid
    ) {
      window.localStorage.setItem("preferredWorkspaceId", routeWorkspaceUuid);
    }
  }, [routeWorkspaceUuid]);

  useEffect(() => {
    if (
      !derivedWorkspaceUuid ||
      routeWorkspaceUuid ||
      readPreferredWorkspaceId()
    ) {
      return;
    }

    window.localStorage.setItem("preferredWorkspaceId", derivedWorkspaceUuid);
  }, [derivedWorkspaceUuid, routeWorkspaceUuid]);

  useEffect(() => {
    const onChatNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ChatNameUpdatedDetail>).detail;
      if (!(detail?.id && detail?.name)) {
        return;
      }

      setChats((prev) => {
        const now = new Date().toISOString();
        const existing = prev.find((chat) => chat.slug === detail.id);
        const next = existing
          ? prev.map((chat) =>
              chat.slug === detail.id
                ? {
                    ...chat,
                    icon: detail.icon ?? chat.icon ?? null,
                    title: detail.name,
                    updatedAt: now,
                  }
                : chat
            )
          : workspaceUuid
            ? [createOptimisticChatSummary({ detail, workspaceUuid }), ...prev]
            : prev;

        if (workspaceUuid) {
          writeCachedChats(workspaceUuid, next);
        }
        return next;
      });
      void loadChats();
    };

    const onChatStreamStatus = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamStatusDetail>).detail;
      if (!detail?.chatId) {
        return;
      }
      if (detail.status === "submitted" || detail.status === "streaming") {
        setPendingChatSlug(detail.chatId);
        void loadChats();
        return;
      }
      if (detail.status === "ready" || detail.status === "error") {
        if (detail.status === "ready") {
          void loadChats();
        }
        setPendingChatSlug((prev) => (prev === detail.chatId ? null : prev));
      }
    };

    window.addEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    return () => {
      window.removeEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, [loadChats, workspaceUuid]);

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    [chats]
  );

  const pinnedChats = useMemo(
    () => sortedChats.filter((chat) => chat.pinned),
    [sortedChats]
  );

  const otherChats = useMemo(
    () => sortedChats.filter((chat) => !chat.pinned),
    [sortedChats]
  );
  const chatSearchNeedle = chatSearchQuery.trim().toLowerCase();
  const filteredPinnedChats = useMemo(
    () =>
      pinnedChats.filter((chat) =>
        chatSearchNeedle
          ? chat.title.toLowerCase().includes(chatSearchNeedle)
          : true
      ),
    [chatSearchNeedle, pinnedChats]
  );
  const filteredOtherChats = useMemo(
    () =>
      otherChats.filter((chat) =>
        chatSearchNeedle
          ? chat.title.toLowerCase().includes(chatSearchNeedle)
          : true
      ),
    [chatSearchNeedle, otherChats]
  );

  const navigateToFilesRoot = useCallback(
    async (options?: { openInNewPane?: boolean; openInNewTab?: boolean }) => {
      try {
        const preferredWorkspaceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("preferredWorkspaceId")
            : null;
        const preferred = preferredWorkspaceId
          ? workspaces.find(
              (workspace) => workspace.workspaceId === preferredWorkspaceId
            )
          : undefined;
        const targetWorkspace =
          preferred ??
          (activeWorkspace
            ? {
                name: "Workspace",
                organizationId: undefined,
                rootFolderId: activeWorkspace.rootFolderId,
                workspaceId: activeWorkspace.workspaceId,
              }
            : undefined) ??
          workspaces[0];

        if (targetWorkspace) {
          navigate(
            `/workspace/files/${targetWorkspace.workspaceId}/folder/${targetWorkspace.rootFolderId}` as Route,
            options
          );
          return;
        }

        const response = await fetch("/api/workspaces", { cache: "no-store" });
        if (!response.ok) {
          navigate("/workspace/files" as Route, options);
          return;
        }

        const payload = (await response.json()) as {
          workspaceUuid?: string;
          rootFolderUuid?: string;
        };

        if (payload.workspaceUuid && payload.rootFolderUuid) {
          navigate(
            `/workspace/files/${payload.workspaceUuid}/folder/${payload.rootFolderUuid}` as Route,
            options
          );
          return;
        }

        navigate("/workspace/files" as Route, options);
      } catch {
        navigate("/workspace/files" as Route, options);
      }
    },
    [activeWorkspace, navigate, workspaces]
  );

  const activateFilesAndEmitIntent = useCallback(
    async (intent: Parameters<typeof filesUiActions.emitIntent>[0]) => {
      if (isMobile) {
        setMobileSidebarView("files");
      } else {
        setDesktopSidebarView("files");
      }

      await navigateToFilesRoot({ openInNewPane: false });
      window.setTimeout(() => {
        filesUiActions.emitIntent(intent);
      }, 0);
    },
    [isMobile, navigateToFilesRoot]
  );

  const loadWorkspaces = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces/list", {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        workspaces?: Array<{
          workspaceId: string;
          organizationId: string;
          rootFolderId: string;
          name: string;
        }>;
      };
      const nextWorkspaces = payload.workspaces ?? [];
      setWorkspaces(nextWorkspaces);
      writeCachedWorkspaces(nextWorkspaces);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }
    void loadWorkspaces();
  }, [deferredStartupReady, loadWorkspaces]);

  const activeOrgSyncRef = useRef<string | null>(null);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces/invitations", {
        cache: "no-store",
      });
      if (!response.ok) {
        setInvitations([]);
        return;
      }
      const payload = (await response.json()) as {
        invitations?: Array<{
          id: string;
          organizationId: string;
          organizationName: string;
          inviterName: string | null;
          inviterEmail: string;
        }>;
      };
      setInvitations(payload.invitations ?? []);
    } catch {
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }
    void loadInvitations();
  }, [deferredStartupReady, loadInvitations]);

  useEffect(() => {
    const onWorkspaceInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
          payload?: {
            action?: string | null;
            chat?: unknown;
            chatSlug?: string | null;
          } | null;
          workspaceUuid?: string;
        }>
      ).detail;
      if (!detail?.workspaceUuid || detail.workspaceUuid !== workspaceUuid) {
        return;
      }

      if (detail.kind === "chat") {
        const patched = applyChatRealtimeEvent(chats, detail.payload ?? null);
        if (patched) {
          setChats(patched);
          if (workspaceUuid) {
            writeCachedChats(workspaceUuid, patched);
          }
          return;
        }

        void loadChats();
      }
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      onWorkspaceInvalidated
    );
    return () => {
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        onWorkspaceInvalidated
      );
    };
  }, [chats, loadChats, workspaceUuid]);

  const createChat = () => {
    navigate(createFreshNewChatHref());
  };

  const updateChat = async (
    chatSlug: string,
    updates: { title?: string; pinned?: boolean }
  ) => {
    const data = await parseResponse<{ chat: ChatSummary }>(
      await fetch(`/api/chats/${chatSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
    );

    if (!data?.chat) {
      return;
    }

    setChats((prev) =>
      prev.map((chat) => (chat.slug === chatSlug ? data.chat : chat))
    );
  };

  const deleteChat = async (chatSlug: string) => {
    const response = await fetch(
      `/api/chat?${new URLSearchParams({ id: chatSlug }).toString()}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      return;
    }

    const remaining = chats.filter((chat) => chat.slug !== chatSlug);
    setChats(remaining);

    if (activeChatSlug === chatSlug) {
      navigate(createFreshNewChatHref(), { replace: true });
    }
  };

  const setActiveOrganization = useCallback(
    async (organizationId?: string | null) => {
      if (!organizationId) {
        return;
      }
      const response = await fetch("/api/auth/organization/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!response.ok) {
        throw new Error("Unable to switch active organization");
      }
    },
    []
  );

  useEffect(() => {
    const match = pathname.match(/^\/workspace\/files\/([^/]+)/);
    const workspaceIdFromRoute = match?.[1];
    if (!(workspaceIdFromRoute && workspaces.length > 0)) {
      return;
    }
    const targetWorkspace = workspaces.find(
      (workspace) => workspace.workspaceId === workspaceIdFromRoute
    );
    if (!targetWorkspace?.organizationId) {
      return;
    }
    const syncKey = `${workspaceIdFromRoute}:${targetWorkspace.organizationId}`;
    if (activeOrgSyncRef.current === syncKey) {
      return;
    }
    activeOrgSyncRef.current = syncKey;
    void setActiveOrganization(targetWorkspace.organizationId).catch(() => {
      activeOrgSyncRef.current = null;
    });
  }, [pathname, setActiveOrganization, workspaces]);

  const switchWorkspace = async (workspace: {
    workspaceId: string;
    organizationId?: string;
    rootFolderId: string;
    name: string;
  }) => {
    try {
      await setActiveOrganization(workspace.organizationId ?? null);
    } catch {
      return;
    }
    window.localStorage.setItem("preferredWorkspaceId", workspace.workspaceId);
    navigate(
      `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}` as Route
    );
  };

  const createWorkspace = async (name: string) => {
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      let message = "Unable to create workspace.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }

    const payload = (await response.json()) as {
      workspace?: {
        workspaceId: string;
        organizationId: string;
        rootFolderId: string;
        name: string;
      };
    };
    if (!payload.workspace) {
      throw new Error("Workspace was created but could not be loaded.");
    }

    await loadWorkspaces();
    await switchWorkspace(payload.workspace);
  };

  const respondToInvitation = async (
    invitationId: string,
    action: "accept" | "decline"
  ) => {
    const response = await fetch(
      `/api/workspaces/invitations/${invitationId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      organizationId?: string | null;
      workspace?: {
        workspaceId: string;
        organizationId: string;
        rootFolderId: string;
        name: string;
      } | null;
    };

    await loadInvitations();

    if (action === "accept") {
      if (payload.organizationId) {
        await setActiveOrganization(payload.organizationId);
      }
      await loadWorkspaces();
      if (payload.workspace) {
        await switchWorkspace(payload.workspace);
      }
    }
  };

  useHotkey(
    "Mod+Shift+1",
    (event) => {
      event.preventDefault();
      if (!isChatsRoute) {
        const chatSlug = activeChatSlug || chats[0]?.slug;
        if (chatSlug) {
          navigate(`/workspace/chats/${chatSlug}` as Route);
          return;
        }
        navigate("/workspace/chats" as Route);
        return;
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+2",
    (event) => {
      event.preventDefault();
      if (!pathname.startsWith("/workspace/flashcards")) {
        navigate("/workspace/flashcards" as Route);
        return;
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+3",
    (event) => {
      event.preventDefault();
      if (!pathname.startsWith("/workspace/tasks")) {
        navigate("/workspace/tasks" as Route);
        return;
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+4",
    (event) => {
      event.preventDefault();
      if (!pathname.startsWith("/workspace/files")) {
        void navigateToFilesRoot();
        return;
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+N",
    (event) => {
      event.preventDefault();
      setEditingChatSlug(null);
      setEditingTitle("");
      void createChat();
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+P",
    (event) => {
      event.preventDefault();
      commandPaletteActions.open();
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+N",
    (event) => {
      event.preventDefault();
      void activateFilesAndEmitIntent("createFolder");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+U",
    (event) => {
      event.preventDefault();
      void activateFilesAndEmitIntent("uploadFile");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+U",
    (event) => {
      event.preventDefault();
      void activateFilesAndEmitIntent("uploadFolder");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+O",
    (event) => {
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("openSelection");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Delete",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("deleteSelection");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Z",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("undoMutation");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+Z",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("redoMutation");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Y",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("redoMutation");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Alt+ArrowLeft",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("goParent");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+M",
    (event) => {
      event.preventDefault();
      if (activeView !== "files") {
        return;
      }
      filesUiActions.emitIntent("moveSelectionUp");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+O",
    (event) => {
      event.preventDefault();
      void activateFilesAndEmitIntent("newNote");
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+L",
    (event) => {
      event.preventDefault();
      void activateFilesAndEmitIntent("importLink");
    },
    { ignoreInputs: true }
  );

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-10 md:block",
          state === "collapsed" && !isPeekabooActive
            ? "pointer-events-auto"
            : "pointer-events-none"
        )}
        onPointerEnter={openPeekSidebar}
        onPointerLeave={closePeekSidebar}
      />
      <Sidebar
        className={cn(
          "z-40 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          className,
          isPeekabooActive && "ring-1 ring-sidebar-border"
        )}
        onPointerEnter={openPeekSidebar}
        onPointerLeave={closePeekSidebar}
        style={
          {
            ...style,
            left: isPeekabooActive ? "0" : undefined,
            top: isPeekabooActive ? "0.75rem" : undefined,
            bottom: isPeekabooActive ? "0.75rem" : undefined,
            borderRadius: isPeekabooActive ? "1.5rem" : undefined,
          } as React.CSSProperties
        }
        variant="inset"
        {...props}
      >
        <SidebarContent>
          <TooltipProvider delay={280}>
            <SidebarGroup className="px-1.5 pb-1">
              <div className="flex h-7 items-center gap-1.5 px-2">
                <SidebarGroupLabel className="h-auto flex-1 px-0">
                  Workspace
                </SidebarGroupLabel>
                <Button
                  aria-label={
                    state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
                  }
                  className="size-6 shrink-0 rounded-md"
                  onClick={() => {
                    setPeekHovered(false);
                    toggleSidebar();
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <PanelLeftIcon
                    className={cn(
                      "size-3.5 transition-transform duration-300",
                      state === "expanded" ? "rotate-180" : "rotate-0"
                    )}
                  />
                </Button>
              </div>
              <ExpandableTabs
                allowDeselect={false}
                className="mt-0.5"
                contextMenuContent={(item) => {
                  const href = (() => {
                    switch (item.value) {
                      case "chat":
                        return primaryChatRoute;
                      case "flashcards":
                        return "/workspace/flashcards" as Route;
                      case "tasks":
                        return "/workspace/tasks" as Route;
                      case "files":
                        return primaryFilesRoute;
                      default:
                        return "/workspace" as Route;
                    }
                  })();

                  return (
                    <>
                      <ContextMenuItem onClick={() => navigate(href)}>
                        <MessageSquare className="mr-2 size-3.5" />
                        Open
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => navigate(href, { openInNewPane: true })}
                      >
                        <Columns className="mr-2 size-3.5" />
                        Open in new pane
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => navigate(href, { openInNewTab: true })}
                      >
                        <Plus className="mr-2 size-3.5" />
                        Open in new tab
                      </ContextMenuItem>
                    </>
                  );
                }}
                items={[
                  { value: "chat", label: "Method", icon: MessageSquare },
                  { value: "flashcards", label: "Mindset", icon: Sparkles },
                  { value: "tasks", label: "Tasks", icon: ListChecks },
                  { value: "files", label: "Manage", icon: Files },
                ]}
                onItemClick={(item, event) => {
                  const nextView = item.value as
                    | "chat"
                    | "flashcards"
                    | "files"
                    | "tasks";

                  if (event.ctrlKey && event.shiftKey) {
                    const href = (() => {
                      switch (item.value) {
                        case "chat":
                          return primaryChatRoute;
                        case "flashcards":
                          return "/workspace/flashcards" as Route;
                        case "tasks":
                          return "/workspace/tasks" as Route;
                        case "files":
                          return primaryFilesRoute;
                        default:
                          return "/workspace" as Route;
                      }
                    })();
                    navigate(href, { openInNewTab: true });
                    return;
                  }

                  if (isMobile) {
                    setMobileSidebarView(nextView);
                  } else {
                    setDesktopSidebarView(nextView);
                  }
                }}
                onItemContextMenu={(item, _event) => {
                  if (isMobile) {
                    return;
                  }

                  const nextView = item.value as
                    | "chat"
                    | "flashcards"
                    | "files"
                    | "tasks";
                  if (isMobile) {
                    setMobileSidebarView(nextView);
                  } else {
                    setDesktopSidebarView(nextView);
                  }
                }}
                onItemHover={(item) => {
                  warmWorkspaceSection(
                    item.value as "chat" | "flashcards" | "files" | "tasks"
                  );
                }}
                onValueChange={(nextValue) => {
                  if (!nextValue) {
                    return;
                  }
                  const nextView = nextValue as
                    | "chat"
                    | "flashcards"
                    | "files"
                    | "tasks";
                  if (isMobile) {
                    setMobileSidebarView(nextView);
                  } else {
                    setDesktopSidebarView(nextView);
                  }
                }}
                persistenceKey="dashboard-workspace-tabs"
                value={activeTabValue}
              />
            </SidebarGroup>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {sidebarView === "workspace" ? (
                <div className="absolute inset-0 overflow-y-auto px-1.5 py-1.5">
                  <SidebarGroup>
                    <SidebarGroupLabel>Workspace Home</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SectionButton
                          contextMenuContent={
                            <>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate(createFreshNewChatHref())
                                }
                              >
                                <MessageSquare className="mr-2 size-3.5" />
                                Open
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate(createFreshNewChatHref(), {
                                    openInNewPane: true,
                                  })
                                }
                              >
                                <Columns className="mr-2 size-3.5" />
                                Open in new pane
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate(createFreshNewChatHref(), {
                                    openInNewTab: true,
                                  })
                                }
                              >
                                <Plus className="mr-2 size-3.5" />
                                Open in new tab
                              </ContextMenuItem>
                            </>
                          }
                          dragHref={"/workspace/chats/new" as Route}
                          icon={MessageSquare}
                          label="Open Method"
                          onClick={(event) => {
                            closeMobileSidebar();
                            if (event.ctrlKey && event.shiftKey) {
                              navigate(createFreshNewChatHref(), {
                                openInNewTab: true,
                              });
                              return;
                            }
                            navigate(createFreshNewChatHref(), {
                              openInNewPane: !isMobile && event.altKey,
                            });
                          }}
                        />
                        <SectionButton
                          contextMenuContent={
                            <>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate("/workspace/flashcards" as Route)
                                }
                              >
                                <Sparkles className="mr-2 size-3.5" />
                                Open
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate("/workspace/flashcards" as Route, {
                                    openInNewPane: true,
                                  })
                                }
                              >
                                <Columns className="mr-2 size-3.5" />
                                Open in new pane
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate("/workspace/flashcards" as Route, {
                                    openInNewTab: true,
                                  })
                                }
                              >
                                <Plus className="mr-2 size-3.5" />
                                Open in new tab
                              </ContextMenuItem>
                            </>
                          }
                          dragHref={"/workspace/flashcards" as Route}
                          icon={Sparkles}
                          label="Open Mindset"
                          onClick={(event) => {
                            closeMobileSidebar();
                            if (event.ctrlKey && event.shiftKey) {
                              navigate("/workspace/flashcards" as Route, {
                                openInNewTab: true,
                              });
                              return;
                            }
                            if (!isMobile) {
                              setDesktopSidebarView("flashcards");
                              navigate("/workspace/flashcards" as Route, {
                                openInNewPane: event.altKey,
                              });
                              return;
                            }
                            navigate("/workspace/flashcards" as Route, {
                              openInNewPane: false,
                            });
                          }}
                        />
                        <SectionButton
                          contextMenuContent={
                            <>
                              <ContextMenuItem
                                onClick={() =>
                                  void navigateToFilesRoot({
                                    openInNewPane: false,
                                  })
                                }
                              >
                                <Files className="mr-2 size-3.5" />
                                Open
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  void navigateToFilesRoot({
                                    openInNewPane: true,
                                  })
                                }
                              >
                                <Columns className="mr-2 size-3.5" />
                                Open in new pane
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  void navigateToFilesRoot({
                                    openInNewTab: true,
                                  })
                                }
                              >
                                <Plus className="mr-2 size-3.5" />
                                Open in new tab
                              </ContextMenuItem>
                            </>
                          }
                          dragHref={primaryFilesRoute}
                          icon={Files}
                          label="Open Manage"
                          onClick={(event) => {
                            closeMobileSidebar();
                            if (event.ctrlKey && event.shiftKey) {
                              void navigateToFilesRoot({
                                openInNewTab: true,
                              });
                              return;
                            }
                            if (!isMobile) {
                              setDesktopSidebarView("files");
                              void navigateToFilesRoot({
                                openInNewPane: event.altKey,
                              });
                              return;
                            }
                            void navigateToFilesRoot({
                              openInNewPane: false,
                            });
                          }}
                        />
                        <SectionButton
                          contextMenuContent={
                            <>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate("/workspace/tasks" as Route)
                                }
                              >
                                <ListChecks className="mr-2 size-3.5" />
                                Open
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate("/workspace/tasks" as Route, {
                                    openInNewPane: true,
                                  })
                                }
                              >
                                <Columns className="mr-2 size-3.5" />
                                Open in new pane
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  navigate("/workspace/tasks" as Route, {
                                    openInNewTab: true,
                                  })
                                }
                              >
                                <Plus className="mr-2 size-3.5" />
                                Open in new tab
                              </ContextMenuItem>
                            </>
                          }
                          dragHref={"/workspace/tasks" as Route}
                          icon={ListChecks}
                          label="Open Tasks"
                          onClick={(event) => {
                            closeMobileSidebar();
                            if (event.ctrlKey && event.shiftKey) {
                              navigate("/workspace/tasks" as Route, {
                                openInNewTab: true,
                              });
                              return;
                            }
                            navigate("/workspace/tasks" as Route, {
                              openInNewPane: !isMobile && event.altKey,
                            });
                          }}
                        />
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </div>
              ) : sidebarView === "tasks" ? (
                <DeferredSidebarTaskPreview
                  activeWorkspaceId={activeWorkspace?.workspaceId}
                  closeMobileSidebar={closeMobileSidebar}
                  navigate={navigate}
                />
              ) : sidebarView ? (
                <>
                  <div
                    aria-hidden={sidebarView !== "chat"}
                    className={
                      mountedViews.has("chat")
                        ? `absolute inset-0 overflow-y-auto ${
                            sidebarView === "chat"
                              ? ""
                              : "pointer-events-none hidden"
                          }`
                        : "hidden"
                    }
                  >
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SectionHeader
                          actions={
                            <>
                              <SectionIconAction
                                icon={MagnifyingGlass}
                                label="Search methods"
                                onClick={() => {
                                  commandPaletteActions.open({
                                    scope: "chats",
                                  });
                                }}
                              />
                              <SectionIconAction
                                icon={PlusCircle}
                                label="New method"
                                onClick={() => {
                                  void triggerHaptic("selection");
                                  setEditingChatSlug(null);
                                  setEditingTitle("");
                                  void createChat();
                                }}
                              />
                            </>
                          }
                          title="Methods"
                        />
                        <Input
                          className="mt-2 hidden h-8"
                          onChange={(event) =>
                            setChatSearchQuery(event.target.value)
                          }
                          placeholder="Search methods..."
                          value={chatSearchQuery}
                        />
                      </SidebarGroupContent>
                    </SidebarGroup>

                    <ChatListSection
                      activeChatSlug={activeChatSlug}
                      editingChatSlug={editingChatSlug}
                      editingTitle={editingTitle}
                      onCancelRename={() => {
                        setEditingChatSlug(null);
                        setEditingTitle("");
                      }}
                      onDelete={(chatSlug) => {
                        setEditingChatSlug(null);
                        setEditingTitle("");
                        void deleteChat(chatSlug);
                      }}
                      onEditingTitleChange={setEditingTitle}
                      onFinishRename={(chatSlug) => {
                        void updateChat(chatSlug, { title: editingTitle });
                        setEditingChatSlug(null);
                        setEditingTitle("");
                      }}
                      onSelect={(chatSlug) => {
                        setEditingChatSlug(null);
                        setEditingTitle("");
                        navigate(`/workspace/chats/${chatSlug}` as Route);
                      }}
                      onSelectInNewPane={(chatSlug) => {
                        setEditingChatSlug(null);
                        setEditingTitle("");
                        navigate(`/workspace/chats/${chatSlug}` as Route, {
                          openInNewPane: true,
                        });
                      }}
                      onSelectInNewTab={(chatSlug) => {
                        setEditingChatSlug(null);
                        setEditingTitle("");
                        navigate(`/workspace/chats/${chatSlug}` as Route, {
                          openInNewTab: true,
                        });
                      }}
                      onStartRename={(chat) => {
                        setEditingChatSlug(chat.slug);
                        setEditingTitle(chat.title);
                      }}
                      onTogglePin={(chatSlug, pinned) => {
                        void updateChat(chatSlug, { pinned });
                      }}
                      otherChats={filteredOtherChats}
                      pendingChatSlug={pendingChatSlug}
                      pinnedChats={filteredPinnedChats}
                    />
                  </div>
                  <div
                    aria-hidden={sidebarView !== "files"}
                    className={
                      mountedViews.has("files")
                        ? `absolute inset-0 ${
                            sidebarView === "files"
                              ? ""
                              : "pointer-events-none hidden"
                          }`
                        : "hidden"
                    }
                  >
                    {sidebarView === "files" ? (
                      <DeferredFilesSidebarPanel
                        currentFileId={currentFileId}
                        currentFolderId={currentFolderId}
                        emitGlobalFileIntent={activateFilesAndEmitIntent}
                        key={`${workspaceUuid ?? "no-workspace"}:${currentFolderId ?? "root"}:${currentFileId ?? "no-file"}`}
                        navigateToFilesRoot={navigateToFilesRoot}
                        workspaceUuid={workspaceUuid}
                      />
                    ) : null}
                  </div>
                  <div
                    aria-hidden={sidebarView !== "flashcards"}
                    className={
                      mountedViews.has("flashcards")
                        ? `absolute inset-0 ${
                            sidebarView === "flashcards"
                              ? ""
                              : "pointer-events-none hidden"
                          }`
                        : "hidden"
                    }
                  >
                    <FlashcardsSidebarPanel
                      active={sidebarView === "flashcards"}
                      activeSetId={currentFlashcardSetId}
                      workspaceUuid={workspaceUuid}
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-start p-4">
                  <SidebarEmptyState
                    description="Pick a workspace surface above to load its actions, shortcuts, and context."
                    icon={Sparkles}
                    title="Choose a surface"
                  />
                </div>
              )}
            </div>
          </TooltipProvider>
        </SidebarContent>
        <SidebarFooter>
          <div className="mb-1.5 flex items-center justify-between gap-1.5 px-1.5">
            <div className="flex items-center gap-1">
              <Button
                className="hit-area size-7"
                onClick={() => {
                  void triggerHaptic("selection");
                  openOverlayAfterCollapse(() => setTrashOpen(true));
                }}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Open trash</span>
              </Button>
              <Button
                className="hit-area size-7"
                onClick={() => {
                  void triggerHaptic("selection");
                  openOverlayAfterCollapse(() => {
                    filesUiActions.toggleUploadActivityOpen();
                  });
                }}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Waves className="size-3.5" />
                <span className="sr-only">Open upload activity</span>
              </Button>
              <Button
                className="hit-area size-7"
                id="dashboard-settings-trigger"
                onClick={() => {
                  void triggerHaptic("selection");
                  openOverlayAfterCollapse(() => setSettingsOpen(true));
                }}
                onFocus={() => {
                  void import("@/components/settings/settings-dialog").catch(
                    () => undefined
                  );
                }}
                onPointerEnter={() => {
                  void import("@/components/settings/settings-dialog").catch(
                    () => undefined
                  );
                }}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Settings className="size-3.5" />
                <span className="sr-only">Open settings</span>
              </Button>
            </div>
          </div>
          {deferredStartupReady ? (
            <DeferredNavUser
              activeWorkspaceId={workspaceUuid}
              invitations={invitations}
              onAcceptInvitation={(invitationId) => {
                void respondToInvitation(invitationId, "accept");
              }}
              onCreateWorkspace={createWorkspace}
              onDeclineInvitation={(invitationId) => {
                void respondToInvitation(invitationId, "decline");
              }}
              onSwitchWorkspace={(workspace) => {
                void switchWorkspace(workspace);
              }}
              user={user}
              workspaces={workspaces}
            />
          ) : (
            <div className="h-14" />
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
