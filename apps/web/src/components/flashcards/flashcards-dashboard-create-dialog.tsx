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
import { Plus } from "@phosphor-icons/react/Plus";
import type { FlashcardsDashboardRuntime } from "@/components/flashcards/use-flashcards-dashboard";

export function FlashcardsDashboardCreateDialog({
  runtime,
}: {
  runtime: FlashcardsDashboardRuntime;
}) {
  return (
    <Dialog onOpenChange={runtime.setCreateOpen} open={runtime.createOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" />
        New Mindset Set
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create mindset set</DialogTitle>
          <DialogDescription>
            Shared mindset sets stay at workspace scope. Review history stays
            personal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="flashcards-set-title">Title</Label>
            <Input
              id="flashcards-set-title"
              onChange={(event) => runtime.setTitle(event.target.value)}
              placeholder="Control systems"
              value={runtime.title}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flashcards-set-description">Description</Label>
            <Textarea
              id="flashcards-set-description"
              onChange={(event) => runtime.setDescription(event.target.value)}
              placeholder="Feedback, stability, and state-space revision"
              value={runtime.description}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flashcards-set-tags">Tags</Label>
            <Input
              id="flashcards-set-tags"
              onChange={(event) => runtime.setTags(event.target.value)}
              placeholder="signals, controls, exam-2"
              value={runtime.tags}
            />
          </div>
        </div>
        {runtime.createStatus ? (
          <p className="text-muted-foreground text-xs">
            {runtime.createStatus}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={runtime.busy || !runtime.title.trim()}
            onClick={() => {
              void runtime.createSet();
            }}
            type="button"
          >
            Create mindset set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
