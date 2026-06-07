"use client";

import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import {
  Files,
  ListChecks,
  Chat as MessageSquare,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

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
  const filesHref = activeWorkspace
    ? (`/workspace/files/${activeWorkspace.workspaceId}/folder/${activeWorkspace.rootFolderId}` as Route)
    : ("/workspace/files" as Route);
  const items = [
    {
      href: createFreshNewChatHref,
      icon: MessageSquare,
      isActive: pathname.startsWith("/workspace/chats"),
      label: "Method",
    },
    {
      href: () => "/workspace/tasks" as Route,
      icon: ListChecks,
      isActive: pathname.startsWith("/workspace/tasks"),
      label: "Tasks",
    },
    {
      href: () => "/workspace/flashcards" as Route,
      icon: Sparkles,
      isActive: pathname.startsWith("/workspace/flashcards"),
      label: "Mindset",
    },
    {
      href: () => filesHref,
      icon: Files,
      isActive: pathname.startsWith("/workspace/files"),
      label: "Manage",
    },
  ];

  return (
    <nav
      aria-label="Workspace sections"
      className="fixed right-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-3 z-40 md:hidden"
    >
      <div className="mx-auto flex h-12 max-w-sm items-center justify-around rounded-xl border border-border/55 bg-background/88 px-1.5 shadow-sm backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              aria-current={item.isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "h-9 min-w-0 flex-1 rounded-lg px-0 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                item.isActive && "bg-muted text-foreground"
              )}
              key={item.label}
              onClick={() => router.push(item.href())}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Icon className="size-[18px]" />
              <span className="sr-only">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
