"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Plus, Warning as TriangleAlert } from "@phosphor-icons/react";
import { SpinnerGap as Loader2 } from "@phosphor-icons/react/SpinnerGap";
import type { QuickCaptureDialogProps } from "@/components/dashboard/quick-capture-model";
import type { QuickCaptureDialogRuntime } from "@/components/dashboard/use-quick-capture-dialog";
import { QuickCaptureDialogFields } from "./quick-capture-dialog-forms";

export function QuickCaptureDialogSurface({
  runtime,
  trigger,
  workspaceUuid,
}: Pick<QuickCaptureDialogProps, "trigger" | "workspaceUuid"> & {
  runtime: QuickCaptureDialogRuntime;
}) {
  return (
    <Dialog onOpenChange={runtime.handleOpenChange} open={runtime.resolvedOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-4xl" largeWidth>
        <DialogHeader className="space-y-2">
          <DialogTitle>{runtime.dialogTitle}</DialogTitle>
          <DialogDescription>{runtime.dialogDescription}</DialogDescription>
        </DialogHeader>

        <QuickCaptureDialogFields
          runtime={runtime}
          workspaceUuid={workspaceUuid}
        />

        {runtime.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <p>{runtime.error}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => runtime.handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={runtime.isSubmitDisabled}
            onClick={() => {
              void runtime.submit();
            }}
            type="button"
          >
            {runtime.busyKind === runtime.kind ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {runtime.submitLabel}
              </>
            ) : (
              <>
                <Plus className="size-4" />
                {runtime.submitLabel}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
