"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@avenire/ui/components/breadcrumb";
import { Spinner } from "@avenire/ui/components/spinner";
import { ChatText as MessageSquareText } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { Chat } from "@/components/chat/chat";
import { ChatIcon } from "@/components/chat/chat-icon";
import type { ChatWorkspaceRuntime } from "@/components/dashboard/use-chat-workspace";
import { isChatIconName } from "@/lib/chat-icons";
import { HeaderActions, HeaderBreadcrumbs, HeaderTitle } from "./header-portal";

const ChatWorkspaceShareDialog = dynamic(
  () =>
    import("@/components/dashboard/chat-workspace-share-dialog").then(
      (module) => module.ChatWorkspaceShareDialog
    ),
  { loading: () => null, ssr: false }
);

export function ChatWorkspaceSurface({
  runtime,
}: {
  runtime: ChatWorkspaceRuntime;
}) {
  let headerIcon = (
    <MessageSquareText className="hidden size-3.5 text-muted-foreground sm:inline-flex" />
  );
  if (runtime.isPending) {
    headerIcon = <Spinner className="size-3.5 text-foreground/80" />;
  } else if (isChatIconName(runtime.icon)) {
    headerIcon = (
      <ChatIcon
        className="hidden size-3.5 text-muted-foreground sm:inline-flex"
        name={runtime.icon}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <HeaderTitle>{runtime.title}</HeaderTitle>
      <HeaderActions>
        {runtime.canShare ? (
          <ChatWorkspaceShareDialog
            isOpen={runtime.isShareDialogOpen}
            onCopyLink={runtime.handleCopyShareLink}
            onGenerateLink={runtime.handleGenerateShareLink}
            onOpenChange={runtime.handleShareDialogOpenChange}
            onShareEmailChange={runtime.handleShareEmailChange}
            onShareWithEmail={runtime.handleShareWithEmail}
            shareBusy={runtime.shareBusy}
            shareEmail={runtime.shareEmail}
            shareLink={runtime.shareLink}
            shareStatus={runtime.shareStatus}
            shareSuggestions={runtime.shareSuggestions}
          />
        ) : null}
      </HeaderActions>
      <HeaderBreadcrumbs>
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap overflow-hidden whitespace-nowrap pr-2">
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex max-w-full items-center gap-1.5 overflow-hidden font-medium text-sm leading-none">
                {headerIcon}
                <span className="min-w-0 truncate">{runtime.title}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </HeaderBreadcrumbs>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full">
          <Chat
            id={runtime.currentChatSlug}
            initialMessages={runtime.resolvedInitialMessages}
            initialPrompt={runtime.initialPrompt}
            isReadonly={runtime.isReadonly}
            key={runtime.currentChatSlug}
            selectedModel="apollo-apex"
            title={runtime.title}
            userName={runtime.userName}
            workspaceUuid={runtime.workspaceUuid}
          />
        </div>
      </div>
    </div>
  );
}
