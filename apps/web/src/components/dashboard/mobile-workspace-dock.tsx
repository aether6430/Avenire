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
  House,
  ListChecks,
  Chat as MessageSquare,
  Waveform,
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
  const isChatRoute = pathname.startsWith("/workspace/chats");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(false);
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
  useEffect(() => {
    setDockExpanded((expanded) => (pathname && expanded ? false : expanded));
  }, [pathname]);

  const focusChatComposer = () => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      "[data-testid='multimodal-input']"
    );
    textarea?.focus();
  };

  return (
    <>
      <nav
        aria-label="Workspace sections"
        className="fixed right-0 bottom-[calc(0.35rem+env(safe-area-inset-bottom))] left-0 z-40 flex justify-center px-2.5 md:hidden"
      >
        {isChatRoute && !dockExpanded ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="grid h-12 w-full max-w-[24.5rem] grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={springs.fast}
          >
            <Button
              aria-label="Open navigation"
              className="h-12 w-12 rounded-full border border-border/55 bg-background/92 p-0 text-muted-foreground shadow-[0_12px_34px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl hover:bg-secondary/80 hover:text-foreground"
              onClick={() => setDockExpanded(true)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <DotsThree className="size-5" weight="bold" />
            </Button>
            <button
              className="flex h-12 min-w-0 items-center justify-center rounded-full border border-border/45 bg-background/92 px-4 font-medium text-[15px] text-foreground shadow-[0_12px_34px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-colors hover:bg-secondary/70"
              onClick={focusChatComposer}
              type="button"
            >
              <span className="truncate">Chat</span>
            </button>
            <Button
              aria-label="Focus composer"
              className="h-12 w-12 rounded-full border border-border/55 bg-background/92 p-0 text-muted-foreground shadow-[0_12px_34px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl hover:bg-secondary/80 hover:text-foreground"
              onClick={focusChatComposer}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Waveform className="size-5" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="grid h-[3.2rem] w-full max-w-[24.5rem] grid-cols-5 items-center gap-1 rounded-full border border-border/55 bg-background/95 px-1.5 shadow-[0_12px_38px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl dark:bg-background/90"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            ref={dockRef}
            transition={springs.fast}
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
                      "flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-full border border-transparent bg-transparent p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
                      item.isActive &&
                        "border-border/50 bg-secondary/75 text-foreground shadow-none",
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
                    <span className="max-w-full truncate text-[9px] leading-none">
                      {item.label}
                    </span>
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
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
