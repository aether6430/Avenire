"use client";

import { useCallback, useMemo, useState } from "react";
import type { MessageWidgetInsertionPayload } from "@/components/chat/message-model";
import { dispatchNoteWidgetInsertion } from "@/lib/note-widgets";
import { useHeaderStore } from "@/stores/header-store";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

export function useMessageNoteWidgets() {
  const panes = useWorkspacePaneStore((state) => state.panes);
  const focusPane = useWorkspacePaneStore((state) => state.focusPane);
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const paneHeaders = useHeaderStore((state) => state.byPane);
  const [noteInsertDialogOpen, setNoteInsertDialogOpen] = useState(false);
  const [pendingNoteWidget, setPendingNoteWidget] =
    useState<MessageWidgetInsertionPayload | null>(null);

  const noteTargets = useMemo(
    () =>
      panes
        .filter((pane) => pane.route.pathname.startsWith("/workspace/files"))
        .sort((left, right) => {
          if (left.id === activePaneId) {
            return -1;
          }
          if (right.id === activePaneId) {
            return 1;
          }
          return left.id.localeCompare(right.id);
        })
        .map((pane) => {
          const title = paneHeaders[pane.id]?.title?.trim();
          const routeLabel = pane.route.pathname.replace(
            "/workspace/files/",
            ""
          );
          return {
            id: pane.id,
            label: title || routeLabel || "Files pane",
            route: `${pane.route.pathname}${pane.route.search}`,
          };
        }),
    [activePaneId, paneHeaders, panes]
  );

  const openNoteInsertDialog = useCallback(
    (payload: MessageWidgetInsertionPayload) => {
      setPendingNoteWidget(payload);
      setNoteInsertDialogOpen(true);
    },
    []
  );

  const closeNoteInsertDialog = useCallback(() => {
    setNoteInsertDialogOpen(false);
    setPendingNoteWidget(null);
  }, []);

  const insertIntoNoteTarget = useCallback(
    (paneId: string) => {
      if (!pendingNoteWidget) {
        return;
      }

      focusPane(paneId);
      const payload = pendingNoteWidget;
      setPendingNoteWidget(null);
      setNoteInsertDialogOpen(false);
      window.requestAnimationFrame(() => {
        dispatchNoteWidgetInsertion(payload);
      });
    },
    [focusPane, pendingNoteWidget]
  );

  return {
    activePaneId,
    closeNoteInsertDialog,
    insertIntoNoteTarget,
    noteInsertDialogOpen,
    noteTargets,
    openNoteInsertDialog,
  };
}
