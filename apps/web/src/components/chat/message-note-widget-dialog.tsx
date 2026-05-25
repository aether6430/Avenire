"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";

export function MessageNoteWidgetDialog({
  activePaneId,
  noteTargets,
  onInsert,
  onOpenChange,
  open,
}: {
  activePaneId: string | null;
  noteTargets: Array<{
    id: string;
    label: string;
    route: string;
  }>;
  onInsert: (paneId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to note</DialogTitle>
          <DialogDescription>
            Choose which open note pane should receive this widget.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {noteTargets.length > 0 ? (
            noteTargets.map((target) => (
              <Button
                className="justify-start gap-3"
                key={target.id}
                onClick={() => onInsert(target.id)}
                type="button"
                variant={target.id === activePaneId ? "default" : "outline"}
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {target.label}
                </span>
                <span className="text-muted-foreground text-xs">
                  {target.id === activePaneId ? "Active" : "Open"}
                </span>
              </Button>
            ))
          ) : (
            <div className="rounded-lg border border-border/60 border-dashed px-4 py-5 text-muted-foreground text-sm">
              Open a file pane first, then try adding the widget again.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
