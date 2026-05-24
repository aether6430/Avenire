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

export function FlashcardsDashboardMisconceptionDialog({
  misconception,
  onAdjustConfidence,
  onClear,
  onClose,
  onOpenFlashcards,
  onOpenTutor,
}: {
  misconception: MisconceptionRecord | null;
  onAdjustConfidence: (
    misconception: MisconceptionRecord,
    delta: number
  ) => void;
  onClear: (misconception: MisconceptionRecord) => void;
  onClose: () => void;
  onOpenFlashcards: (misconception: MisconceptionRecord) => void;
  onOpenTutor: (misconception: MisconceptionRecord) => void;
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
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 p-0 sm:h-[92vh] sm:w-[96vw] sm:max-w-[1200px] sm:rounded-xl sm:border lg:max-w-[1280px]">
        {misconception ? (
          <div className="flex h-full min-h-0 flex-col bg-background">
            <DialogHeader className="border-border/50 border-b px-5 py-5 sm:px-8 sm:py-7">
              <DialogTitle className="max-w-4xl text-balance font-semibold text-2xl leading-tight sm:text-3xl">
                {misconception.concept}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {misconception.subject} / {misconception.topic}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
              <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="max-w-4xl space-y-8">
                  <section>
                    <h3 className="font-medium text-muted-foreground text-sm">
                      Misconception summary
                    </h3>
                    <p className="mt-3 text-foreground text-xl leading-8">
                      {misconception.blocks?.summary ?? misconception.reason}
                    </p>
                  </section>
                  <section className="border-border/50 border-t pt-6">
                    <h3 className="font-medium text-muted-foreground text-sm">
                      Corrected mental model
                    </h3>
                    <p className="mt-3 text-base text-foreground leading-7">
                      {misconception.blocks?.correctedMentalModel ??
                        "Open this with Apollo to build a corrected model from the misconception evidence."}
                    </p>
                  </section>
                  <section className="border-border/50 border-t pt-6">
                    <h3 className="font-medium text-muted-foreground text-sm">
                      Short explanation
                    </h3>
                    <p className="mt-3 text-base text-muted-foreground leading-7">
                      {misconception.blocks?.explanation ??
                        misconception.reason}
                    </p>
                  </section>
                </div>
                <aside className="space-y-5">
                  <div className="border-border/50 border-b pb-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium text-muted-foreground text-sm">
                        Concept confidence
                      </p>
                      <p className="font-semibold text-2xl text-foreground">
                        {Math.round(misconception.confidence * 100)}%
                      </p>
                    </div>
                    <p className="mt-2 text-muted-foreground text-xs leading-5">
                      Estimate of how stable the learner&apos;s understanding is
                      for this concept.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="rounded-md" variant="outline">
                        {misconception.source}
                      </Badge>
                      <Badge className="rounded-md" variant="outline">
                        {misconception.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        className="justify-center"
                        onClick={() => onAdjustConfidence(misconception, -0.1)}
                        type="button"
                        variant="outline"
                      >
                        Decrease
                      </Button>
                      <Button
                        className="justify-center"
                        onClick={() => onAdjustConfidence(misconception, 0.1)}
                        type="button"
                        variant="outline"
                      >
                        Increase
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full justify-start"
                    onClick={() => onOpenTutor(misconception)}
                    type="button"
                    variant="outline"
                  >
                    <MessageSquareText className="size-4" />
                    Method with Apollo
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => onOpenFlashcards(misconception)}
                    type="button"
                    variant="outline"
                  >
                    <BookOpenCheck className="size-4" />
                    Generate Mindset Set
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => onClear(misconception)}
                    type="button"
                    variant="secondary"
                  >
                    Clear misconception
                  </Button>
                </aside>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
