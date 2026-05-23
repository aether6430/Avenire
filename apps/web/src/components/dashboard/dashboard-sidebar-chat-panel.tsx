"use client";

import { Input } from "@avenire/ui/components/input";
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@avenire/ui/components/sidebar";
import { PlusCircle } from "@phosphor-icons/react";
import { MagnifyingGlass } from "@phosphor-icons/react/MagnifyingGlass";
import { useEffect, useRef } from "react";
import type { ChatSummary } from "@/lib/chat-data";
import { ChatListSection } from "./dashboard-sidebar-chat-list-section";
import { SectionHeader, SectionIconAction } from "./dashboard-sidebar-shared";

export function DashboardSidebarChatPanel({
  activeChatSlug,
  chatActionStatus,
  chatsErrorMessage,
  chatsLoadFailed,
  chatsLoading,
  chatSearchQuery,
  editingChatSlug,
  editingTitle,
  isSearchOpen,
  onCancelRename,
  onCreateChat,
  onDelete,
  onEditingTitleChange,
  onFinishRename,
  onSelect,
  onSelectInNewPane,
  onStartRename,
  onToggleSearch,
  onTogglePin,
  onUpdateChatSearchQuery,
  otherChats,
  pendingChatSlug,
  pinnedChats,
}: {
  activeChatSlug: string;
  chatActionStatus?: string | null;
  chatsErrorMessage?: string | null;
  chatsLoadFailed?: boolean;
  chatsLoading?: boolean;
  chatSearchQuery: string;
  editingChatSlug: string | null;
  editingTitle: string;
  isSearchOpen: boolean;
  onCancelRename: () => void;
  onCreateChat: () => void;
  onDelete: (chatSlug: string) => void;
  onEditingTitleChange: (value: string) => void;
  onFinishRename: (chatSlug: string) => void;
  onSelect: (chatSlug: string) => void;
  onSelectInNewPane: (chatSlug: string) => void;
  onStartRename: (chat: ChatSummary) => void;
  onToggleSearch: () => void;
  onTogglePin: (chatSlug: string, pinned: boolean) => void;
  onUpdateChatSearchQuery: (value: string) => void;
  otherChats: ChatSummary[];
  pendingChatSlug: string | null;
  pinnedChats: ChatSummary[];
}) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SectionHeader
            actions={
              <>
                <SectionIconAction
                  icon={MagnifyingGlass}
                  label="Search Methods"
                  onClick={onToggleSearch}
                />
                <SectionIconAction
                  icon={PlusCircle}
                  label="New Method"
                  onClick={onCreateChat}
                />
              </>
            }
            title="Methods"
          />
          {isSearchOpen || chatSearchQuery ? (
            <Input
              className="mt-2 h-8"
              onChange={(event) => onUpdateChatSearchQuery(event.target.value)}
              placeholder="Search Methods..."
              ref={searchInputRef}
              value={chatSearchQuery}
            />
          ) : null}
        </SidebarGroupContent>
      </SidebarGroup>

      <ChatListSection
        activeChatSlug={activeChatSlug}
        chatActionStatus={chatActionStatus}
        chatsErrorMessage={chatsErrorMessage}
        chatsLoadFailed={chatsLoadFailed}
        chatsLoading={chatsLoading}
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
        otherChats={otherChats}
        pendingChatSlug={pendingChatSlug}
        pinnedChats={pinnedChats}
      />
    </>
  );
}
