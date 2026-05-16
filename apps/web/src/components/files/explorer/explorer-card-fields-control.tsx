"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Input } from "@avenire/ui/components/input";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import {
  ArrowCounterClockwise as RotateCcw,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react";
import { Plus } from "@phosphor-icons/react/Plus";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { EXPLORER_MAX_VISIBLE_CARD_PROPERTIES } from "./explorer-controls-model";

export function ExplorerCardFieldsControl({
  cardFieldQuery,
  cardPropertyKeys,
  filteredAvailablePropertyDefinitions,
  menuSurfaceClass,
  onCardFieldQueryChange,
  onCardFieldToggle,
  onClearCardFields,
  onResetCardFields,
  selectedCardPropertyDefinitions,
}: {
  cardFieldQuery: string;
  cardPropertyKeys: string[];
  filteredAvailablePropertyDefinitions: WorkspacePropertyDefinition[];
  menuSurfaceClass: string;
  onCardFieldQueryChange: (value: string) => void;
  onCardFieldToggle: (definitionKey: string, checked: boolean) => void;
  onClearCardFields: () => void;
  onResetCardFields: () => void;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
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
        <SlidersHorizontal className="size-3.5" />
        Card fields
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {selectedCardPropertyDefinitions.length}/
          {EXPLORER_MAX_VISIBLE_CARD_PROPERTIES}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-[220px] bg-background", menuSurfaceClass)}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-3 px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
            <span>Visible card fields</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case">
              {selectedCardPropertyDefinitions.length}/
              {EXPLORER_MAX_VISIBLE_CARD_PROPERTIES}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {selectedCardPropertyDefinitions.length > 0 ? (
          <ScrollArea className="max-h-40">
            <div className="p-1">
              {selectedCardPropertyDefinitions.map((definition) => (
                <DropdownMenuCheckboxItem
                  checked
                  key={definition.key}
                  onCheckedChange={() =>
                    onCardFieldToggle(definition.key, false)
                  }
                >
                  {definition.key}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="px-2 py-2 text-muted-foreground text-xs">
            No visible fields selected.
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus className="size-3.5" />
            Add field
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("w-[220px] bg-background p-0", menuSurfaceClass)}
          >
            <div className="border-border/60 border-b p-2">
              <Input
                className="h-8 border-0 bg-transparent px-2 text-xs shadow-none"
                onChange={(event) => onCardFieldQueryChange(event.target.value)}
                placeholder="Search fields..."
                value={cardFieldQuery}
              />
            </div>
            <ScrollArea className="max-h-56">
              <div className="p-1">
                {filteredAvailablePropertyDefinitions.length === 0 ? (
                  <div className="px-2 py-2 text-muted-foreground text-xs">
                    No matching fields.
                  </div>
                ) : (
                  filteredAvailablePropertyDefinitions.map((definition) => {
                    const checked = cardPropertyKeys.includes(definition.key);
                    const atLimit =
                      selectedCardPropertyDefinitions.length >=
                        EXPLORER_MAX_VISIBLE_CARD_PROPERTIES && !checked;

                    return (
                      <DropdownMenuCheckboxItem
                        checked={checked}
                        disabled={atLimit}
                        key={definition.key}
                        onCheckedChange={(nextChecked) =>
                          onCardFieldToggle(
                            definition.key,
                            nextChecked === true
                          )
                        }
                      >
                        {definition.key}
                      </DropdownMenuCheckboxItem>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onResetCardFields}>
          <RotateCcw className="size-3.5" />
          Reset
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={cardPropertyKeys.length === 0}
          onClick={onClearCardFields}
        >
          <X className="size-3.5" />
          Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
