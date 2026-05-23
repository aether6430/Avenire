"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { Textarea } from "@avenire/ui/components/textarea";
import { PlusCircle } from "@phosphor-icons/react/PlusCircle";
import type { FlashcardsSidebarPanelRuntime } from "@/components/flashcards/use-flashcards-sidebar-panel";

export function FlashcardsSidebarPanelCreateDialog({
  runtime,
}: {
  runtime: FlashcardsSidebarPanelRuntime;
}) {
  return (
    <Dialog onOpenChange={runtime.setCreateOpen} open={runtime.createOpen}>
      <DialogTrigger
        render={
          <Button
            aria-label="New Mindset Set"
            className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <PlusCircle className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Mindset Set</DialogTitle>
          <DialogDescription>
            Create a workspace-level Mindset Set.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="flashcards-sidebar-title">Title</Label>
            <Input
              id="flashcards-sidebar-title"
              onChange={(event) => runtime.setTitle(event.target.value)}
              value={runtime.title}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flashcards-sidebar-description">Description</Label>
            <Textarea
              id="flashcards-sidebar-description"
              onChange={(event) => runtime.setDescription(event.target.value)}
              value={runtime.description}
            />
          </div>
          {runtime.createStatus ? (
            <p className="text-destructive text-sm">{runtime.createStatus}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            disabled={runtime.busy || !runtime.title.trim()}
            onClick={() => {
              void runtime.createSet();
            }}
            type="button"
          >
            Create Mindset Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
