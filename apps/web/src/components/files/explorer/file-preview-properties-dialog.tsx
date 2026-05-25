"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { SlidersHorizontal } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type { ChangeEvent, RefObject } from "react";
import type { PropertiesTableProps } from "@/components/editor/properties-table";
import type {
  FrontmatterProperties,
  WorkspacePropertyDefinition,
} from "@/lib/frontmatter";

const PropertiesTable = dynamic<PropertiesTableProps>(
  () =>
    import("@/components/editor/properties-table").then(
      (module) => module.PropertiesTable
    ),
  { loading: () => null, ssr: false }
);

interface FilePreviewPropertiesDialogProps {
  activeFileIsMarkdown: boolean;
  definitions: WorkspacePropertyDefinition[];
  noteBannerInputRef: RefObject<HTMLInputElement | null>;
  onBannerInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDefinitionsChange: (definitions: WorkspacePropertyDefinition[]) => void;
  onOpenChange: (open: boolean) => void;
  onPropertiesChange: (properties: FrontmatterProperties) => void;
  open: boolean;
  properties: FrontmatterProperties;
  readOnly: boolean;
}

export function FilePreviewPropertiesDialog({
  activeFileIsMarkdown,
  definitions,
  noteBannerInputRef,
  open,
  onBannerInputChange,
  onDefinitionsChange,
  onOpenChange,
  onPropertiesChange,
  properties,
  readOnly,
}: FilePreviewPropertiesDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-[calc(100vw-1rem)] overflow-visible rounded-lg border border-border/60 bg-background p-0 shadow-md sm:max-w-[26rem]">
        <DialogHeader className="border-border/60 border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
            <SlidersHorizontal className="size-3" />
            Properties
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-visible p-3.5">
          <PropertiesTable
            className="mx-0 mb-0 max-w-none border-0 px-0 pt-0 pb-0 sm:px-0"
            definitions={definitions}
            disabled={readOnly}
            onChange={onPropertiesChange}
            onDefinitionsChange={onDefinitionsChange}
            properties={properties}
          />
          {activeFileIsMarkdown ? (
            <input
              accept="image/*"
              className="hidden"
              onChange={onBannerInputChange}
              ref={noteBannerInputRef}
              type="file"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
