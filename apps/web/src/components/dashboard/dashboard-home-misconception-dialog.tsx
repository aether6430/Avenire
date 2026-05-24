"use client";

import type { MisconceptionRecord } from "@avenire/database";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { ChatText as MessageSquareText } from "@phosphor-icons/react";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react/BookOpenText";

export function DashboardHomeMisconceptionDialog({
  misconception,
  onClose,
  onOpenFlashcards,
  onOpenTutor,
  onImprove,
  onResolve,
}: {
  misconception: MisconceptionRecord | null;
  onClose: () => void;
  onOpenFlashcards: (misconception: MisconceptionRecord) => void;
  onOpenTutor: (misconception: MisconceptionRecord) => void;
  onImprove: (misconception: MisconceptionRecord) => void;
  onResolve: (misconception: MisconceptionRecord) => void;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={misconception !== null}
    >
      <DialogContent className="max-w-2xl">
        {misconception ? (
          <>
            <DialogHeader>
              <DialogTitle>{misconception.concept}</DialogTitle>
              <DialogDescription>
                {misconception.subject} / {misconception.topic}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-foreground text-sm">{misconception.reason}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-md" variant="outline">
                  Confidence {Math.round(misconception.confidence * 100)}%
                </Badge>
                <Badge className="rounded-md" variant="outline">
                  {misconception.source}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onOpenTutor(misconception)}
                  type="button"
                >
                  <MessageSquareText className="size-4" />
                  Method with Apollo
                </Button>
                <Button
                  onClick={() => onOpenFlashcards(misconception)}
                  type="button"
                  variant="outline"
                >
                  <BookOpenCheck className="size-4" />
                  Generate Mindset Set
                </Button>
                <Button
                  onClick={() => {
                    void onImprove(misconception);
                  }}
                  type="button"
                  variant="outline"
                >
                  Improve mastery
                </Button>
                <Button
                  onClick={() => {
                    void onResolve(misconception);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Clear misconception
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
