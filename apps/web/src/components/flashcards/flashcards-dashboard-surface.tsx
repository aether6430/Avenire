"use client";

import { Button } from "@avenire/ui/components/button";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  HeaderActions,
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
  HeaderTitle,
} from "@/components/dashboard/header-portal";
import { FlashcardsDashboardCreateDialog } from "@/components/flashcards/flashcards-dashboard-create-dialog";
import { FlashcardsDashboardPanels } from "@/components/flashcards/flashcards-dashboard-panels";
import type { FlashcardsDashboardRuntime } from "@/components/flashcards/use-flashcards-dashboard";

export function FlashcardsDashboardSurface({
  runtime,
}: {
  runtime: FlashcardsDashboardRuntime;
}) {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <HeaderTitle>Mindset Sets</HeaderTitle>
        <HeaderLeadingIcon>
          <BookOpenCheck className="size-3.5" />
        </HeaderLeadingIcon>
        <HeaderActions>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!runtime.reviewTarget}
              onClick={runtime.openReviewTarget}
              type="button"
            >
              <BookOpenCheck className="size-4" />
              Go to Mindset Set
            </Button>
            <FlashcardsDashboardCreateDialog runtime={runtime} />
          </div>
        </HeaderActions>
        <HeaderBreadcrumbs>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              Mindset Sets
            </p>
          </div>
        </HeaderBreadcrumbs>

        <AnimatePresence>
          {runtime.generationLoading ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-secondary/50 p-5"
              initial={{ opacity: 0, y: 10 }}
              key="flashcard-generation"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Generating Mindset Set
                  </p>
                  <h2 className="font-semibold text-foreground text-lg tracking-tight">
                    Building your Mindset Set from onboarding
                  </h2>
                  <p className="max-w-2xl text-muted-foreground text-sm leading-6">
                    The set is being generated now. Once it is ready, you will
                    land directly in the Mindset Set view.
                  </p>
                </div>
                <div className="rounded-full bg-secondary px-3 py-1 text-muted-foreground text-xs uppercase tracking-[0.15em]">
                  Loading
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Generate", "Create", "Open"].map((label, index) => (
                  <div
                    className="rounded-md bg-secondary/40 px-3 py-3"
                    key={label}
                  >
                    <motion.div
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      className="h-2 w-16 rounded-full bg-foreground/40"
                      transition={{
                        delay: index * 0.12,
                        duration: 1.1,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    <p className="mt-3 font-medium text-foreground text-sm">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {runtime.generationError ? (
          <div className="rounded-2xl border border-border/70 bg-background p-4 text-muted-foreground text-sm">
            {runtime.generationError}
          </div>
        ) : null}

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <FlashcardsDashboardPanels runtime={runtime} />
        </motion.div>
      </div>
    </div>
  );
}
