"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { Input } from "@avenire/ui/components/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@avenire/ui/components/tooltip";
import {
  Chat as MessageSquare,
  DotsThree as MoreHorizontal,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { GitBranch } from "@phosphor-icons/react/GitBranch";
import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import type { Route } from "next";
import { useMemo, useRef } from "react";
import { ChatIcon } from "@/components/chat/chat-icon";
import type { ChatSummary } from "@/lib/chat-data";
import { isChatIconName } from "@/lib/chat-icons";
import { setWorkspacePaneDragData } from "@/lib/workspace-panes";
import { getSidebarChatListState } from "./dashboard-sidebar-chats-model";
import { SidebarEmptyState } from "./dashboard-sidebar-shared";

export function ChatListSection({
  activeChatSlug,
  chatActionStatus,
  chatsLoadFailed,
  chatsLoading,
  editingChatSlug,
  editingTitle,
  onEditingTitleChange,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onSelect,
  onSelectInNewPane,
  onTogglePin,
  onDelete,
  pendingChatSlug,
  pinnedChats,
  otherChats,
}: {
  activeChatSlug: string;
  chatActionStatus?: string | null;
  chatsLoadFailed?: boolean;
  chatsLoading?: boolean;
  editingChatSlug: string | null;
  editingTitle: string;
  onEditingTitleChange: (value: string) => void;
  onStartRename: (chat: ChatSummary) => void;
  onFinishRename: (chatSlug: string) => void;
  onCancelRename: () => void;
  onSelect: (chatSlug: string) => void;
  onSelectInNewPane?: (chatSlug: string) => void;
  onTogglePin: (chatSlug: string, pinned: boolean) => void;
  onDelete: (chatSlug: string) => void;
  pendingChatSlug: string | null;
  pinnedChats: ChatSummary[];
  otherChats: ChatSummary[];
}) {
  const chatListState = getSidebarChatListState({
    loadFailed: Boolean(chatsLoadFailed),
    loading: Boolean(chatsLoading),
    otherCount: otherChats.length,
    pinnedCount: pinnedChats.length,
  });
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
        title: "Pinned Methods",
        type: "header",
      });
      for (const chat of pinnedChats) {
        nextRows.push({ chat, key: `chat-${chat.slug}`, type: "chat" });
      }
    }

    nextRows.push({
      key: "header-other",
      title: "Other Methods",
      type: "header",
    });
    for (const chat of otherChats) {
      nextRows.push({ chat, key: `chat-${chat.slug}`, type: "chat" });
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

  if (chatListState) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Methods</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarEmptyState
            description={chatListState.description}
            icon={MessageSquare}
            title={chatListState.title}
          />
          {chatActionStatus ? (
            <p className="px-2 pt-2 text-destructive text-xs">
              {chatActionStatus}
            </p>
          ) : null}
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto px-2 pb-2" ref={scrollRef}>
        {chatActionStatus ? (
          <p className="px-2 pt-2 text-destructive text-xs">
            {chatActionStatus}
          </p>
        ) : null}
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
  onTogglePin: (chatSlug: string, pinned: boolean) => void;
  onDelete: (chatSlug: string) => void;
}) {
  const isEditing = editingChatSlug === chat.slug;
  const isPending = pendingChatSlug === chat.slug;
  const iconName = isChatIconName(chat.icon) ? chat.icon : null;

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
          <SidebarMenuButton
            draggable
            isActive={activeChatSlug === chat.slug}
            onClick={(event) => {
              if (event.altKey) {
                event.preventDefault();
                onSelectInNewPane?.(chat.slug);
                return;
              }
              onSelect(chat.slug);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              onSelectInNewPane?.(chat.slug);
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
