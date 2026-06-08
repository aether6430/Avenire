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
  Files,
  House,
  ListChecks,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [sheetOpen, setSheetOpen] = useState(false);
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
  useEffect(() => {
    measureItems();
  }, [measureItems]);

  return (
    <>
      <nav
        aria-label="Workspace sections"
        className="fixed right-0 bottom-[calc(0.35rem+env(safe-area-inset-bottom))] left-0 z-40 flex justify-center px-2.5 md:hidden"
      >
        <div
          className="grid h-[3.35rem] w-full max-w-[24.5rem] grid-cols-5 items-center gap-1 rounded-xl border border-border/65 bg-background/96 px-1.5 shadow-[0_12px_38px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl dark:bg-background/92"
          ref={dockRef}
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
                ref={(node) => registerItem(index, node)}
                transition={springs.fast}
              >
                <Button
                  aria-current={item.isActive ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent bg-transparent p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
                    item.isActive &&
                      "border-border/60 bg-secondary/75 text-foreground shadow-none",
                    isNear && !item.isActive && "text-foreground"
                  )}
                  onClick={() => {
                    if (item.isActive) {
                      setSheetOpen(true);
                      return;
                    }
                    router.push(item.href());
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Icon className="size-4" />
                  <span className="max-w-full truncate text-[9.5px] leading-none">
                    {item.label}
                  </span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </nav>
      <Drawer onOpenChange={setSheetOpen} open={sheetOpen}>
        <DrawerContent className="md:hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle>{activeItem?.label ?? "Workspace"}</DrawerTitle>
            <DrawerDescription>
              {activeWorkspace ? "Workspace shortcuts" : "Workspace context"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={cn(
                    "flex min-h-20 flex-col justify-between rounded-xl border border-border/55 bg-secondary/35 p-3 text-left text-muted-foreground transition-colors",
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
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
