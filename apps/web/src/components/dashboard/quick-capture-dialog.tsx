"use client";

import { QuickCaptureDialogSurface } from "@/components/dashboard/quick-capture-dialog-surface";
import type { QuickCaptureDialogProps } from "@/components/dashboard/quick-capture-model";
import { useQuickCaptureDialog } from "@/components/dashboard/use-quick-capture-dialog";

export function QuickCaptureDialog(props: QuickCaptureDialogProps) {
  const runtime = useQuickCaptureDialog(props);

  return (
    <QuickCaptureDialogSurface
      runtime={runtime}
      trigger={props.trigger}
      workspaceUuid={props.workspaceUuid}
    />
  );
}
