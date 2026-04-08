"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { Textarea } from "@avenire/ui/components/textarea";
import {
  BookOpenText as BookOpenCheck,
  ChatCenteredText as MessageSquareDashed,
  MagnifyingGlass,
  PlusCircle,
} from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  readCachedFlashcardSets,
  writeCachedFlashcardSets,
} from "@/lib/dashboard-browser-cache";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import { commandPaletteActions } from "@/stores/commandPaletteStore";

export function FlashcardsSidebarPanel({
  active,
  activeSetId,
  workspaceUuid,
}: {
  active: boolean;
  activeSetId?: string;
  workspaceUuid?: string | null;
}) {
  const router = useRouter();
  const setsWorkspaceRef = useRef<string | null>(workspaceUuid ?? null);
  const [sets, setSets] = useState<FlashcardSetSummary[]>(() =>
    workspaceUuid ? (readCachedFlashcardSets(workspaceUuid) ?? []) : []
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSets = useCallback(
    async (signal?: AbortSignal) => {
      if (!workspaceUuid) {
        return;
      }

      const response = await fetch("/api/flashcards/sets", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        sets?: FlashcardSetSummary[];
      };
      const nextSets = payload.sets ?? [];
      setSets(nextSets);
      if (setsWorkspaceRef.current === workspaceUuid) {
        writeCachedFlashcardSets(workspaceUuid, nextSets);
      }
    },
    [workspaceUuid]
  );

  useEffect(() => {
    if (!(active && workspaceUuid)) {
      return;
    }

    setsWorkspaceRef.current = workspaceUuid;
    const cachedSets = readCachedFlashcardSets(workspaceUuid);
    if (cachedSets) {
      setSets(cachedSets);
    } else {
      setSets([]);
    }

    const controller = new AbortController();
    loadSets(controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [active, loadSets, workspaceUuid]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    if (setsWorkspaceRef.current !== workspaceUuid) {
      return;
    }
    writeCachedFlashcardSets(workspaceUuid, sets);
  }, [sets, workspaceUuid]);

  useEffect(() => {
    const onWorkspaceInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
          workspaceUuid?: string;
        }>
      ).detail;
      if (!detail?.workspaceUuid || detail.workspaceUuid !== workspaceUuid) {
        return;
      }
      if (detail.kind !== "flashcards") {
        return;
      }

      loadSets().catch(() => undefined);
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
  }, [loadSets, workspaceUuid]);

  const createSet = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/flashcards/sets", {
        body: JSON.stringify({ description, title }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        set?: { id?: string };
      };
      const setId = payload.set?.id;
      if (!setId) {
        return;
      }

      setCreateOpen(false);
      setTitle("");
      setDescription("");
      startTransition(() => {
        router.push(`/workspace/flashcards/${setId}` as Route);
      });
    } finally {
      setBusy(false);
    }
  };

  const reviewTarget =
    sets.find((set) => set.dueCount > 0 || set.newCount > 0) ?? null;
  const filteredSets = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return sets;
    }

    return sets.filter((set) =>
      `${set.title} ${set.description ?? ""} ${set.tags.join(" ")}`
        .toLowerCase()
        .includes(needle)
    );
  }, [searchQuery, sets]);

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <SidebarGroup>
        <div className="flex items-center justify-between gap-2">
          <SidebarGroupLabel>Mindset</SidebarGroupLabel>
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
              onClick={() => {
                commandPaletteActions.open();
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MagnifyingGlass className="size-3.5" />
            </Button>
            <Dialog onOpenChange={setCreateOpen} open={createOpen}>
              <DialogTrigger
                render={
                  <Button
                    className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
                    size="icon"
                    type="button"
                    variant="ghost"
                  />
                }
              >
                <PlusCircle className="size-3.5" />
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Set</DialogTitle>
                  <DialogDescription>
                    Create a workspace-level mindset set.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="flashcards-sidebar-title">Title</Label>
                    <Input
                      id="flashcards-sidebar-title"
                      onChange={(event) => setTitle(event.target.value)}
                      value={title}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="flashcards-sidebar-description">
                      Description
                    </Label>
                    <Textarea
                      id="flashcards-sidebar-description"
                      onChange={(event) => setDescription(event.target.value)}
                      value={description}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={busy || !title.trim()}
                    onClick={createSet}
                    type="button"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  if (reviewTarget) {
                    router.push(
                      `/workspace/flashcards/${reviewTarget.id}` as Route
                    );
                    return;
                  }
                  router.push("/workspace/flashcards" as Route);
                }}
                onFocus={() => {
                  if (reviewTarget) {
                    prefetchFlashcardSet(reviewTarget.id).catch(
                      () => undefined
                    );
                  }
                }}
                onMouseEnter={() => {
                  if (reviewTarget) {
                    prefetchFlashcardSet(reviewTarget.id).catch(
                      () => undefined
                    );
                  }
                }}
              >
                <BookOpenCheck className="size-4" />
                <span>Review Due</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push("/workspace/flashcards" as Route)}
              >
                <MessageSquareDashed className="size-4" />
                <span>Import From Method</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="min-h-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <SidebarGroupLabel>Sets</SidebarGroupLabel>
          <Button
            className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
            onClick={() => {
              commandPaletteActions.open();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MagnifyingGlass className="size-3.5" />
          </Button>
        </div>
        <SidebarGroupContent>
          <Input
            className="mb-2 h-8"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search sets..."
            value={searchQuery}
          />
          {filteredSets.length === 0 ? (
            <Empty className="min-h-[8.5rem] rounded-2xl border-border/50 bg-background/60 px-3 py-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpenCheck className="size-4" />
                </EmptyMedia>
                <EmptyTitle className="text-xs">
                  {sets.length === 0 ? "No sets yet" : "No matching sets"}
                </EmptyTitle>
              </EmptyHeader>
              <EmptyContent className="max-w-none">
                <EmptyDescription className="text-[11px] leading-relaxed">
                  {sets.length === 0
                    ? "Create a mindset set or import one from a method to start studying."
                    : "Try a shorter search or clear the filters to reveal more sets."}
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <SidebarMenu>
              {filteredSets.map((set) => (
                <SidebarMenuItem key={set.id}>
                  <SidebarMenuButton
                    isActive={activeSetId === set.id}
                    onClick={() =>
                      router.push(`/workspace/flashcards/${set.id}` as Route)
                    }
                    onFocus={() => {
                      prefetchFlashcardSet(set.id).catch(() => undefined);
                    }}
                    onMouseEnter={() => {
                      prefetchFlashcardSet(set.id).catch(() => undefined);
                    }}
                  >
                    <SparklineChip due={set.dueCount} newCount={set.newCount} />
                    <span className="truncate">{set.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}

function SparklineChip({ due, newCount }: { due: number; newCount: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant="outline">{due}</Badge>
      <Badge variant="secondary">{newCount}</Badge>
    </span>
  );
}
