"use client";

import dynamic from "next/dynamic";
import {
  MessageRenderParts,
  type MessageRenderPartsProps,
} from "@/components/chat/message-parts";
import { useMessageNoteWidgets } from "@/components/chat/use-message-note-widgets";

const MessageNoteWidgetDialog = dynamic(
  () =>
    import("@/components/chat/message-note-widget-dialog").then(
      (module) => module.MessageNoteWidgetDialog
    ),
  { loading: () => null, ssr: false }
);

export function MessageRenderPartsWithNotes(
  props: Omit<MessageRenderPartsProps, "openNoteInsertDialog">
) {
  const noteWidgets = useMessageNoteWidgets();

  return (
    <>
      <MessageRenderParts
        {...props}
        openNoteInsertDialog={noteWidgets.openNoteInsertDialog}
      />
      <MessageNoteWidgetDialog
        activePaneId={noteWidgets.activePaneId}
        noteTargets={noteWidgets.noteTargets}
        onInsert={noteWidgets.insertIntoNoteTarget}
        onOpenChange={(open) => {
          if (open) {
            return;
          }
          noteWidgets.closeNoteInsertDialog();
        }}
        open={noteWidgets.noteInsertDialogOpen}
      />
    </>
  );
}
