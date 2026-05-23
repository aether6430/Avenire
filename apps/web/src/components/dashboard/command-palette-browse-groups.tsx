"use client";

import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@avenire/ui/components/command";
import {
  ClockCounterClockwise,
  ListChecks,
  ChatText as MessageSquareText,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { CaretRight as ChevronRight } from "@phosphor-icons/react/CaretRight";
import { formatTaskDueDate } from "@/lib/tasks";
import {
  buildCommandPaletteRecentMethodValue,
  buildCommandPaletteRecentMindsetSetValue,
  getCommandPaletteTasksState,
  PALETTE_CHEVRON_CLASS,
  PALETTE_GROUP_CLASS,
  PALETTE_ICON_CLASS,
  PALETTE_ITEM_CLASS,
} from "./command-palette-model";
import { CommandPaletteSearchGroups } from "./command-palette-search-groups";
import type { useCommandPalette } from "./use-command-palette";

type CommandPaletteRuntime = ReturnType<typeof useCommandPalette>;

export function CommandPaletteBrowseGroups({
  runtime,
}: {
  runtime: CommandPaletteRuntime;
}) {
  const commandPaletteTasksState = getCommandPaletteTasksState({
    errorMessage: runtime.workspaceTasksErrorMessage,
    loadFailed: runtime.workspaceTasksLoadFailed,
    taskCount: runtime.workspaceTasks.length,
  });

  return (
    <>
      {commandPaletteTasksState.showGroup ? (
        <CommandGroup className={PALETTE_GROUP_CLASS} heading="Upcoming Tasks">
          {commandPaletteTasksState.message ? (
            <div className="px-3 py-2 text-muted-foreground/70 text-sm">
              {commandPaletteTasksState.message}
            </div>
          ) : (
            runtime.workspaceTasks.map((task) => (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                key={`task-${task.id}`}
                onSelect={() => {
                  runtime.openTaskRoute(task.id);
                }}
                value={`${task.title} ${task.description ?? ""} ${task.assignee?.name ?? ""} task`}
              >
                <ListChecks className={PALETTE_ICON_CLASS} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/90 text-sm">
                    {task.title}
                  </p>
                  <p className="truncate text-muted-foreground/60 text-xs">
                    {formatTaskDueDate(task.dueAt)}
                    {task.assignee?.name ? ` • ${task.assignee.name}` : ""}
                  </p>
                </div>
                <ChevronRight className={PALETTE_CHEVRON_CLASS} />
              </CommandItem>
            ))
          )}
        </CommandGroup>
      ) : null}
      {commandPaletteTasksState.showGroup ? <CommandSeparator /> : null}
      {runtime.recentItems.length > 0 ? (
        <CommandGroup className={PALETTE_GROUP_CLASS} heading="Recent Files">
          {runtime.recentItems.map((item) => (
            <CommandItem
              className={PALETTE_ITEM_CLASS}
              key={`recent-${item.id}`}
              onSelect={() => {
                runtime.handleOpenFile(
                  item.workspaceUuid,
                  item.id,
                  item.folderId
                );
              }}
              value={`${item.name} ${item.path} recent`}
            >
              <ClockCounterClockwise className={PALETTE_ICON_CLASS} />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground/90 text-sm">
                  {item.name}
                </p>
                <p className="truncate text-muted-foreground/60 text-xs">
                  {item.path}
                </p>
              </div>
              <ChevronRight className={PALETTE_CHEVRON_CLASS} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {runtime.recentItems.length > 0 ? <CommandSeparator /> : null}
      {runtime.recentChats.length > 0 ? (
        <>
          <CommandGroup
            className={PALETTE_GROUP_CLASS}
            heading="Recent Methods"
          >
            {runtime.recentChats.map((chat) => (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                key={`recent-chat-${chat.slug}`}
                onSelect={() => {
                  runtime.openChatRoute(`/workspace/chats/${chat.slug}`);
                }}
                value={buildCommandPaletteRecentMethodValue({
                  slug: chat.slug,
                  title: chat.title,
                })}
              >
                <MessageSquareText className={PALETTE_ICON_CLASS} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/90 text-sm">
                    {chat.title}
                  </p>
                  <p className="truncate text-muted-foreground/60 text-xs">
                    {chat.slug}
                  </p>
                </div>
                <ChevronRight className={PALETTE_CHEVRON_CLASS} />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </>
      ) : null}
      {runtime.recentFlashcardSets.length > 0 ? (
        <>
          <CommandGroup
            className={PALETTE_GROUP_CLASS}
            heading="Recent Mindset Sets"
          >
            {runtime.recentFlashcardSets.map((set) => (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                key={`recent-flashcard-${set.id}`}
                onSelect={() => {
                  runtime.openFlashcardRoute(`/workspace/flashcards/${set.id}`);
                }}
                value={buildCommandPaletteRecentMindsetSetValue({
                  id: set.id,
                  title: set.title,
                })}
              >
                <Sparkles className={PALETTE_ICON_CLASS} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/90 text-sm">
                    {set.title}
                  </p>
                  <p className="truncate text-muted-foreground/60 text-xs">
                    {set.dueCount + set.newCount} ready
                  </p>
                </div>
                <ChevronRight className={PALETTE_CHEVRON_CLASS} />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </>
      ) : null}
      <CommandPaletteSearchGroups runtime={runtime} />
    </>
  );
}
