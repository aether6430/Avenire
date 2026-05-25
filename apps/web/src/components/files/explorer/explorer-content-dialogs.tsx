"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  type ExplorerEditDialogState,
  type ExplorerLinkImportDialogState,
  type ExplorerPropertiesItem,
  getExplorerEditDialogCopy,
  getExplorerPropertiesRows,
} from "@/components/files/explorer/explorer-content-dialog-model";

export interface ExplorerContentDialogsProps {
  editDialog: ExplorerEditDialogState | null;
  linkImportBusy: boolean;
  linkImportDialog: ExplorerLinkImportDialogState | null;
  onApplyEditDialog: () => void;
  onEditDialogOpenChange: (open: boolean) => void;
  onEditDialogValueChange: (value: string) => void;
  onImportLinkAsResource: () => void;
  onLinkImportDialogOpenChange: (open: boolean) => void;
  onLinkImportNameChange: (value: string) => void;
  onLinkImportUrlChange: (value: string) => void;
  onPropertiesOpenChange: (open: boolean) => void;
  propertiesItem: ExplorerPropertiesItem | null;
  propertiesOpen: boolean;
}

export function ExplorerContentDialogs({
  editDialog,
  linkImportBusy,
  linkImportDialog,
  onApplyEditDialog,
  onEditDialogOpenChange,
  onEditDialogValueChange,
  onImportLinkAsResource,
  onLinkImportDialogOpenChange,
  onLinkImportNameChange,
  onLinkImportUrlChange,
  onPropertiesOpenChange,
  propertiesItem,
  propertiesOpen,
}: ExplorerContentDialogsProps) {
  const editDialogCopy = getExplorerEditDialogCopy(editDialog);
  const propertiesRows = getExplorerPropertiesRows(propertiesItem);

  return (
    <>
      <Dialog onOpenChange={onPropertiesOpenChange} open={propertiesOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Properties</DialogTitle>
            <DialogDescription>
              Item metadata and identifiers.
            </DialogDescription>
          </DialogHeader>
          {propertiesRows.length > 0 ? (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background p-3 text-foreground text-xs">
              {propertiesRows.map((row) => (
                <p className="flex gap-1.5" key={row.label}>
                  <span className="min-w-14 font-medium text-muted-foreground">
                    {row.label}
                  </span>
                  <span
                    className={
                      row.label === "ID" ? "break-all" : "truncate break-words"
                    }
                  >
                    {row.value}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={onEditDialogOpenChange} open={Boolean(editDialog)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editDialogCopy?.title ?? "Edit item"}</DialogTitle>
            <DialogDescription>
              {editDialogCopy?.description ?? "Update the item name."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="item-name-input">
                Name
              </label>
              <Input
                autoFocus
                id="item-name-input"
                onChange={(event) =>
                  onEditDialogValueChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !editDialog?.value.trim()) {
                    return;
                  }
                  event.preventDefault();
                  onApplyEditDialog();
                }}
                placeholder="Name"
                value={editDialog?.value ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => onEditDialogOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!editDialog?.value.trim()}
              onClick={onApplyEditDialog}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={onLinkImportDialogOpenChange}
        open={Boolean(linkImportDialog)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import link</DialogTitle>
            <DialogDescription>
              Save the URL as a workspace resource, then run the existing link
              extractor during ingestion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="link-import-url">
                URL
              </label>
              <Input
                autoFocus
                id="link-import-url"
                onChange={(event) => onLinkImportUrlChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !linkImportDialog?.url.trim()) {
                    return;
                  }
                  event.preventDefault();
                  onImportLinkAsResource();
                }}
                placeholder="https://example.com/article"
                value={linkImportDialog?.url ?? ""}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="link-import-name">
                Name
              </label>
              <Input
                id="link-import-name"
                onChange={(event) => onLinkImportNameChange(event.target.value)}
                placeholder="Optional title"
                value={linkImportDialog?.name ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={linkImportBusy}
              onClick={() => onLinkImportDialogOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!linkImportDialog?.url.trim() || linkImportBusy}
              onClick={onImportLinkAsResource}
              type="button"
            >
              {linkImportBusy ? <Spinner className="size-4" /> : null}
              Save link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
