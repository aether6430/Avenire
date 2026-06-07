"use client";

import { Button } from "@avenire/ui/components/button";
import { useProximityHover } from "@avenire/ui/hooks/use-proximity-hover";
import { cn } from "@avenire/ui/lib/utils";
import { springs } from "@avenire/ui/lib/springs";
import {
  BookOpenText,
  House,
  Files,
  ListChecks,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

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
  const activeIndex = items.findIndex((item) => item.isActive);

  useEffect(() => {
    measureItems();
  }, [measureItems, pathname]);

  return (
    <nav
      aria-label="Workspace sections"
      className="fixed right-0 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] left-0 z-40 flex justify-center px-4 md:hidden"
    >
      <div
        className="relative grid h-14 w-full max-w-[24rem] grid-cols-5 items-center gap-1 rounded-xl border border-border/70 bg-background/92 px-1.5 shadow-sm backdrop-blur-xl dark:bg-background/88"
        ref={dockRef}
        {...proximityHandlers}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isNear = proximityIndex === index;
          return (
            <motion.div
              className="relative z-10"
              key={item.label}
              ref={(node) => registerItem(index, node)}
              transition={springs.fast}
              animate={{
                y: isNear ? -1 : 0,
              }}
            >
              <Button
                aria-current={item.isActive ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent bg-transparent p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
                  item.isActive &&
                    "border-border/70 bg-accent text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
                  isNear && !item.isActive && "text-foreground"
                )}
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
            </motion.div>
          );
        })}
        {activeIndex >= 0 ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 rounded-lg border border-border/60 bg-accent"
            initial={false}
            transition={springs.moderate}
            style={{
              width: "calc((100% - 0.75rem) / 5)",
            }}
            animate={{
              x: `calc(${activeIndex} * (100% + 0.25rem))`,
            }}
          />
        ) : null}
      </div>
    </nav>
  );
}
