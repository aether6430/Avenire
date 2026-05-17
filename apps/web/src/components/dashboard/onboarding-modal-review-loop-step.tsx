"use client";

import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { cn } from "@avenire/ui/lib/utils";
import { m } from "motion/react";
import { useMemo, useState } from "react";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import { StudentCalendar } from "../student-calendar";

export function ReviewLoopStep({
  flashcardSets,
  onStartReview,
}: {
  flashcardSets: FlashcardSetSummary[];
  onStartReview: () => void;
}) {
  const [reviewTimeLocal, setReviewTimeLocal] = useState("");

  const currentReviewTarget = useMemo(
    () =>
      flashcardSets
        .slice()
        .sort(
          (left, right) =>
            right.dueCount + right.newCount - (left.dueCount + left.newCount)
        )
        .find((set) => set.dueCount > 0 || set.newCount > 0) ?? null,
    [flashcardSets]
  );

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = [5, 3, 8, 2, 6, 4, 7];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-black/5 shadow-sm">
        <StudentCalendar />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 shadow-black/5 shadow-sm">
          <p className="mb-3 font-medium text-muted-foreground text-xs">
            Next 7 days · cards due
          </p>
          <div className="flex items-end gap-1.5">
            {days.map((day, index) => (
              <div
                className="flex flex-1 flex-col items-center gap-1"
                key={day}
              >
                <m.div
                  animate={{ height: `${counts[index] * 6}px` }}
                  className={cn(
                    "w-full rounded-md",
                    index === 0 ? "bg-foreground/70" : "bg-foreground/20"
                  )}
                  initial={{ height: 0 }}
                  transition={{
                    delay: 0.1 + index * 0.05,
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <span className="text-[9px] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
          <p className="font-medium text-sm">Daily review time</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            This sets the default time for your review reminder. It does not
            start a session by itself. It just tells Avenire when to nudge you
            back tomorrow.
          </p>
          <Input
            className="mt-4"
            onChange={(event) => setReviewTimeLocal(event.target.value)}
            type="time"
            value={reviewTimeLocal}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
          <p className="font-medium text-sm">First review</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Start with the cards that matter most right now.
          </p>
          <Button className="mt-4 w-full" onClick={onStartReview} type="button">
            Start review session
          </Button>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-black/5 shadow-sm">
          <p className="font-medium text-sm">Why this matters</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            A consistent reminder time keeps the review loop predictable.
          </p>
          {reviewTimeLocal ? (
            <p className="mt-3 text-foreground text-sm">
              Reminder time: {reviewTimeLocal}
            </p>
          ) : null}
          {currentReviewTarget ? (
            <p className="mt-2 text-muted-foreground text-sm">
              Reviewing {currentReviewTarget.title} first.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
