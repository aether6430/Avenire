"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import { Check } from "@phosphor-icons/react";
import { ArrowsDownUp as ArrowUpDown } from "@phosphor-icons/react/ArrowsDownUp";
import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import {
  EXPLORER_SORT_BUILTIN_OPTIONS,
  getExplorerSortDirectionLabel,
  getExplorerSortFieldLabel,
} from "./explorer-controls-model";

export function ExplorerSortControl({
  availablePropertyDefinitions,
  menuSurfaceClass,
  onSortChange,
  sortState,
}: {
  availablePropertyDefinitions: WorkspacePropertyDefinition[];
  menuSurfaceClass: string;
  onSortChange: (nextSortState: SortState) => void;
  sortState: SortState;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-7 rounded-md px-2 text-xs"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <ArrowUpDown className="size-3.5" />
        {getExplorerSortFieldLabel(sortState)} ·{" "}
        {getExplorerSortDirectionLabel(sortState.direction)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-[220px] bg-background", menuSurfaceClass)}
      >
        <ScrollArea className="max-h-72">
          <div className="p-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                Sort options
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {EXPLORER_SORT_BUILTIN_OPTIONS.map((option) => (
              <DropdownMenuSub key={option.key}>
                <DropdownMenuSubTrigger>
                  <ArrowUpDown className="size-3.5" />
                  {option.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className={cn("w-44 bg-background", menuSurfaceClass)}
                >
                  {(["asc", "desc"] as const).map((direction) => (
                    <DropdownMenuItem
                      key={direction}
                      onClick={() =>
                        onSortChange({
                          direction,
                          key: option.key,
                          kind: "builtin",
                        })
                      }
                    >
                      <span className="flex-1">
                        {direction === "asc" ? "Ascending" : "Descending"}
                      </span>
                      {sortState.kind === "builtin" &&
                      sortState.key === option.key &&
                      sortState.direction === direction ? (
                        <Check className="size-3.5" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
            {availablePropertyDefinitions.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                    Properties
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                {availablePropertyDefinitions.map((definition) => (
                  <DropdownMenuSub key={definition.key}>
                    <DropdownMenuSubTrigger>
                      <ArrowUpDown className="size-3.5" />
                      {definition.key}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      className={cn("w-44 bg-background", menuSurfaceClass)}
                    >
                      {(["asc", "desc"] as const).map((direction) => (
                        <DropdownMenuItem
                          key={direction}
                          onClick={() =>
                            onSortChange({
                              direction,
                              key: definition.key,
                              kind: "property",
                              type: definition.type,
                            })
                          }
                        >
                          <span className="flex-1">
                            {direction === "asc" ? "Ascending" : "Descending"}
                          </span>
                          {sortState.kind === "property" &&
                          sortState.key === definition.key &&
                          sortState.direction === direction ? (
                            <Check className="size-3.5" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
