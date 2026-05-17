"use client";

import { Checkbox } from "@avenire/ui/components/checkbox";
import type { ExplorerItemActionsProps } from "@/components/files/explorer/explorer-item-actions";
import { ExplorerItemActions } from "@/components/files/explorer/explorer-item-actions";
import { buildExplorerFileListRowModel } from "@/components/files/explorer/explorer-list-row-model";
import type { SelectionControlCaptureProps } from "@/components/files/explorer/explorer-list-rows-shared";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { cn } from "@/lib/utils";

interface ExplorerFileListRowProps {
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  file: FileRecord;
  icon: React.ReactNode;
  isMobile: boolean;
  isSelected: boolean;
  itemActionProps: ExplorerItemActionsProps;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onToggleSelected: (checked: boolean) => void;
  rowRef: (node: HTMLDivElement | null) => void;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
  selectionControlCaptureProps: SelectionControlCaptureProps;
  showBorder: boolean;
}

export function ExplorerFileListRow({
  dragProps,
  file,
  icon,
  isMobile,
  isSelected,
  itemActionProps,
  onClick,
  onContextMenu,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  onToggleSelected,
  rowRef,
  selectedCardPropertyDefinitions,
  selectionControlCaptureProps,
  showBorder,
}: ExplorerFileListRowProps) {
  const { propertyChips, sizeLabel, updatedLabel } =
    buildExplorerFileListRowModel({
      file,
      selectedCardPropertyDefinitions,
    });

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-3 border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/30",
        showBorder && "border-b",
        isSelected && "bg-primary/10"
      )}
      data-select-item="true"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      ref={rowRef}
      {...dragProps}
    >
      {isMobile ? (
        <>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="min-w-0 truncate font-medium text-sm">{file.name}</p>
          </div>
          <ExplorerItemActions {...itemActionProps} />
        </>
      ) : (
        <>
          <div
            className="relative z-10 flex shrink-0"
            data-selection-control="true"
            onClickCapture={selectionControlCaptureProps.onClickCapture}
            onMouseDownCapture={selectionControlCaptureProps.onMouseDownCapture}
            onPointerDownCapture={
              selectionControlCaptureProps.onPointerDownCapture
            }
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelected(checked === true)}
            />
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60">
            {icon}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="min-w-0 truncate font-medium text-sm">{file.name}</p>
          </div>
          <div className="ml-auto flex items-start gap-4 text-muted-foreground text-xs">
            <div className="flex flex-col items-end gap-1">
              <span className="min-w-[110px] text-right tabular-nums">
                {sizeLabel}
              </span>
              <span className="min-w-[72px] text-right tabular-nums">
                {updatedLabel}
              </span>
            </div>
            {propertyChips.length > 0 ? (
              <div className="flex max-w-[22rem] flex-wrap justify-end gap-1.5">
                {propertyChips.map((chip) => (
                  <span
                    className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/50 bg-background/75 px-2 py-0.5 text-[10px] text-muted-foreground leading-none"
                    key={chip.label}
                    title={`${chip.label}: ${chip.value}`}
                  >
                    <span className="shrink-0 font-medium text-foreground/75">
                      {chip.label}
                    </span>
                    <span className="min-w-0 truncate">{chip.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
