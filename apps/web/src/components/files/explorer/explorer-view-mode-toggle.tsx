"use client";

import { Button } from "@avenire/ui/components/button";
import { ButtonGroup } from "@avenire/ui/components/button-group";
import { GridFour as Grid3X3, List as LayoutList } from "@phosphor-icons/react";
import {
  HEADER_SEGMENT_ICON_BUTTON_CLASS,
  HEADER_SEGMENTED_GROUP_CLASS,
} from "@/components/files/explorer/explorer-controls-shared";
import { cn } from "@/lib/utils";

export function ExplorerViewModeToggle({
  onViewModeChange,
  viewMode,
}: {
  onViewModeChange: (viewMode: "cards" | "list") => void;
  viewMode: "cards" | "list";
}) {
  return (
    <ButtonGroup className={HEADER_SEGMENTED_GROUP_CLASS}>
      <Button
        aria-label="Card view"
        className={cn(
          HEADER_SEGMENT_ICON_BUTTON_CLASS,
          viewMode === "cards" && "bg-secondary"
        )}
        onClick={() => onViewModeChange("cards")}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Grid3X3 className="size-3.5" />
      </Button>
      <Button
        aria-label="List view"
        className={cn(
          HEADER_SEGMENT_ICON_BUTTON_CLASS,
          viewMode === "list" && "bg-secondary"
        )}
        onClick={() => onViewModeChange("list")}
        size="icon"
        type="button"
        variant="ghost"
      >
        <LayoutList className="size-3.5" />
      </Button>
    </ButtonGroup>
  );
}
