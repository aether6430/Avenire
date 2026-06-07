"use client";

import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpenText,
  House,
  Files,
  ListChecks,
  Chat as MessageSquare,
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
  ];

  return (
    <nav
      aria-label="Workspace sections"
      className="fixed right-0 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] left-0 z-40 flex justify-center px-4 md:hidden"
    >
      <div className="grid h-14 w-full max-w-[24rem] grid-cols-5 items-center gap-1 rounded-xl border border-border/70 bg-background/92 px-1.5 shadow-sm backdrop-blur-xl dark:bg-background/88">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              aria-current={item.isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent bg-transparent p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
                item.isActive &&
                  "border-border/70 bg-accent text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]"
              )}
              key={item.label}
              onClick={() => router.push(item.href())}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Icon className="size-[17px]" />
              <span className="max-w-full truncate text-[10px] leading-none">
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
