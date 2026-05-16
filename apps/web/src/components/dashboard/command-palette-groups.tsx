"use client";

import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@avenire/ui/components/command";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  ClockCounterClockwise,
  FileText,
  Folder,
  ListChecks,
  ChatText as MessageSquareText,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { CaretRight as ChevronRight } from "@phosphor-icons/react/CaretRight";
import type { useCommandPalette } from "@/components/dashboard/use-command-palette";
import { formatTaskDueDate } from "@/lib/tasks";
import {
  buildCommandPaletteMethodValue,
  buildCommandPaletteMindsetSetValue,
  buildCommandPaletteRecentMethodValue,
  buildCommandPaletteRecentMindsetSetValue,
  getCommandPaletteTasksState,
  PALETTE_CHEVRON_CLASS,
  PALETTE_GROUP_CLASS,
  PALETTE_ICON_CLASS,
  PALETTE_ITEM_CLASS,
} from "./command-palette-model";

type CommandPaletteRuntime = ReturnType<typeof useCommandPalette>;

export function CommandPaletteGroups({
  runtime,
}: {
  runtime: CommandPaletteRuntime;
}) {
  const commandPaletteTasksState = getCommandPaletteTasksState({
    loadFailed: runtime.workspaceTasksLoadFailed,
    taskCount: runtime.workspaceTasks.length,
  });

  const renderCommandGroups = () => (
    <>
      {runtime.filteredCommands.general.length > 0 ? (
        <CommandGroup className={PALETTE_GROUP_CLASS} heading="General">
          {runtime.filteredCommands.general.map((item) => (
            <CommandItem
              className={PALETTE_ITEM_CLASS}
              key={item.key}
              onSelect={() => item.onSelect()}
              value={[item.label, item.description, ...item.searchTerms].join(
                " "
              )}
            >
              <item.icon className={PALETTE_ICON_CLASS} />
              <div className="min-w-0">
                <p className="font-medium text-foreground/90 text-sm">
                  {item.label}
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  {item.description}
                </p>
              </div>
              {item.shortcut ? (
                <CommandShortcut className="mt-0.5 text-muted-foreground/50 tracking-normal">
                  {item.shortcut}
                </CommandShortcut>
              ) : null}
              <ChevronRight className={PALETTE_CHEVRON_CLASS} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {runtime.filteredCommands.general.length > 0 &&
      runtime.filteredCommands.create.length > 0 ? (
        <CommandSeparator />
      ) : null}
      {runtime.filteredCommands.create.length > 0 ? (
        <CommandGroup className={PALETTE_GROUP_CLASS} heading="Create">
          {runtime.filteredCommands.create.map((item) => (
            <CommandItem
              className={PALETTE_ITEM_CLASS}
              key={item.key}
              onSelect={() => item.onSelect()}
              value={[item.label, item.description, ...item.searchTerms].join(
                " "
              )}
            >
              <item.icon className={PALETTE_ICON_CLASS} />
              <div className="min-w-0">
                <p className="font-medium text-foreground/90 text-sm">
                  {item.label}
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  {item.description}
                </p>
              </div>
              {item.shortcut ? (
                <CommandShortcut className="mt-0.5 text-muted-foreground/50 tracking-normal">
                  {item.shortcut}
                </CommandShortcut>
              ) : null}
              <ChevronRight className={PALETTE_CHEVRON_CLASS} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
    </>
  );

  if (runtime.searchQuery) {
    if (runtime.hasCommandMatches) {
      return renderCommandGroups();
    }

    if (!runtime.hasWorkspaceSearchContext) {
      return (
        <CommandEmpty className="py-8 text-center text-muted-foreground/70 text-sm">
          No matching commands found. Workspace files are still indexing.
        </CommandEmpty>
      );
    }

    return (
      <>
        {runtime.chatResults.length > 0 ? (
          <CommandGroup className={PALETTE_GROUP_CLASS} heading="Methods">
            {runtime.chatResults.map((chat) => (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                key={`chat-${chat.id}`}
                onSelect={() => {
                  runtime.openChatRoute(chat.path);
                }}
                value={buildCommandPaletteMethodValue({
                  description: chat.description,
                  label: chat.label,
                })}
              >
                <MessageSquareText className={PALETTE_ICON_CLASS} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/90 text-sm">
                    {chat.label}
                  </p>
                  <p className="truncate text-muted-foreground/60 text-xs">
                    {chat.description}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 whitespace-nowrap text-muted-foreground/50 text-xs">
                  {chat.meta}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {runtime.flashcardResults.length > 0 ? (
          <>
            {runtime.chatResults.length > 0 ? <CommandSeparator /> : null}
            <CommandGroup
              className={PALETTE_GROUP_CLASS}
              heading="Mindset Sets"
            >
              {runtime.flashcardResults.map((set) => (
                <CommandItem
                  className={PALETTE_ITEM_CLASS}
                  key={`flashcard-${set.id}`}
                  onSelect={() => {
                    runtime.openFlashcardRoute(set.path);
                  }}
                  value={buildCommandPaletteMindsetSetValue({
                    description: set.description,
                    label: set.label,
                  })}
                >
                  <Sparkles className={PALETTE_ICON_CLASS} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground/90 text-sm">
                      {set.label}
                    </p>
                    <p className="truncate text-muted-foreground/60 text-xs">
                      {set.description}
                    </p>
                  </div>
                  <span className="mt-0.5 shrink-0 whitespace-nowrap text-muted-foreground/50 text-xs">
                    {set.meta}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {runtime.fuzzyResults.length > 0 ||
            runtime.isRetrieving ||
            runtime.retrievalResults.length > 0 ? (
              <CommandSeparator />
            ) : null}
          </>
        ) : null}
        {runtime.fuzzyResults.length > 0 ? (
          <CommandGroup
            className={PALETTE_GROUP_CLASS}
            heading="Files and Folders"
          >
            {runtime.fuzzyResults.map((item) => (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                key={`${item.type}-${item.id}`}
                onSelect={() => {
                  if (item.type === "folder") {
                    runtime.handleOpenFolder(item);
                    return;
                  }

                  runtime.handleOpenFile(
                    item.workspaceUuid,
                    item.id,
                    item.folderId
                  );
                }}
                value={`${item.workspaceName} ${item.name} ${item.path} ${item.type}`}
              >
                {item.type === "folder" ? (
                  <Folder className={PALETTE_ICON_CLASS} />
                ) : (
                  <FileText className={PALETTE_ICON_CLASS} />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/90 text-sm">
                    {item.name}
                  </p>
                  <p className="truncate text-muted-foreground/60 text-xs">
                    {item.path}
                  </p>
                  <p className="truncate text-muted-foreground/50 text-xs">
                    {item.workspaceName}
                  </p>
                </div>
                <ChevronRight className={PALETTE_CHEVRON_CLASS} />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {runtime.fuzzyResults.length === 0 &&
        (runtime.isRetrieving || runtime.retrievalResults.length > 0) ? (
          <CommandGroup
            className={PALETTE_GROUP_CLASS}
            heading="Content Search"
          >
            {runtime.isRetrieving ? (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                disabled
                value="searching workspace content"
              >
                <Spinner className={PALETTE_ICON_CLASS} />
                <span className="text-muted-foreground/60 text-sm">
                  Searching workspace content...
                </span>
              </CommandItem>
            ) : null}
            {runtime.retrievalResults.map((result) => (
              <CommandItem
                className={PALETTE_ITEM_CLASS}
                key={`retrieval-${result.id}-${result.chunkId ?? "main"}`}
                onSelect={() => {
                  runtime.openSearchResult(result);
                }}
                value={`${result.title} ${result.path ?? result.title} ${result.snippet}`}
              >
                <FileText className={PALETTE_ICON_CLASS} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/90 text-sm">
                    {result.title}
                  </p>
                  <p className="truncate text-muted-foreground/60 text-xs">
                    {result.path ?? result.title}
                  </p>
                  <p className="truncate text-muted-foreground/50 text-xs">
                    {result.snippet}
                  </p>
                </div>
                <ChevronRight className={PALETTE_CHEVRON_CLASS} />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {runtime.fuzzyResults.length === 0 &&
        !runtime.isRetrieving &&
        runtime.retrievalError ? (
          <CommandEmpty className="py-8 text-center text-muted-foreground/70 text-sm">
            {runtime.retrievalError}
          </CommandEmpty>
        ) : runtime.fuzzyResults.length === 0 &&
          !runtime.isRetrieving &&
          runtime.retrievalResults.length === 0 ? (
          <CommandEmpty className="py-8 text-center text-muted-foreground/70 text-sm">
            No matching commands, files, or content found.
          </CommandEmpty>
        ) : null}
      </>
    );
  }

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
      {renderCommandGroups()}
    </>
  );
}
