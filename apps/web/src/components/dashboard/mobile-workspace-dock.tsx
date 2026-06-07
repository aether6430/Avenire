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
      className="fixed right-0 bottom-[calc(0.7rem+env(safe-area-inset-bottom))] left-0 z-40 flex justify-center px-5 md:hidden"
    >
      <div className="flex h-[3.55rem] items-center gap-1.5 rounded-[1.75rem] border border-white/8 bg-[#0b0b09]/82 px-2 shadow-[0_14px_42px_-26px_rgba(0,0,0,0.9)] backdrop-blur-2xl dark:border-white/8 dark:bg-[#0b0b09]/82">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              aria-current={item.isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "size-11 rounded-full border border-transparent bg-transparent p-0 text-white/48 hover:bg-white/6 hover:text-white/80",
                item.isActive &&
                  "border-white/8 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
