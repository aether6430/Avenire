"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@avenire/ui/components/sheet";
import { TaskDetailPane } from "@/components/tasks/task-detail-pane";
import type { TaskEditorDraft } from "@/components/tasks/types";
import type { WorkspaceMemberOption, WorkspaceTask } from "@/lib/tasks";

export function TaskMobileSheet({
  draft,
  isDirty,
  isOpen,
  isSaving,
  members,
  mode,
  onDelete,
  onDraftChange,
  onOpenChange,
  onReset,
  onSave,
  onToggleComplete,
  workspaceUuid,
  task,
}: {
  draft: TaskEditorDraft | null;
  isDirty: boolean;
  isOpen: boolean;
  isSaving: boolean;
  members: WorkspaceMemberOption[];
  mode: "create" | "edit" | "idle";
  onDelete: () => void;
  onDraftChange: (updates: Partial<TaskEditorDraft>) => void;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onSave: () => void;
  onToggleComplete: () => void;
  workspaceUuid: string;
  task: WorkspaceTask | null;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent
        className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 p-0 sm:inset-y-4 sm:right-4 sm:h-[calc(100dvh-2rem)] sm:w-[min(52rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-border/70 sm:shadow-2xl"
        side="right"
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-border/70 border-b px-4 py-4 sm:px-6">
            <SheetTitle>
              {mode === "create" ? "New task" : "Task details"}
            </SheetTitle>
            <SheetDescription>
              Keep the editor lightweight and precise on small screens.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <TaskDetailPane
              draft={draft}
              isDirty={isDirty}
              isSaving={isSaving}
              members={members}
              mode={mode}
              onDelete={onDelete}
              onDraftChange={onDraftChange}
              onReset={onReset}
              onSave={onSave}
              onToggleComplete={onToggleComplete}
              workspaceUuid={workspaceUuid}
              task={task}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
