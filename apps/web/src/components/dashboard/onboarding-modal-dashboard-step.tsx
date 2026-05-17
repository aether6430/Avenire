"use client";

import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import { Brain, FileText, Lightning as Zap } from "@phosphor-icons/react";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { m } from "motion/react";
import { getOnboardingDashboardCards } from "./onboarding-dashboard-cards-model";

export function DashboardStep({
  onOpenFlashcards,
  onStartReview,
  onStartChatProbe,
}: {
  onOpenFlashcards: () => void;
  onStartReview: () => void;
  onStartChatProbe: () => void;
}) {
  const dashboardCards = getOnboardingDashboardCards();

  return (
    <div className="space-y-3">
      {dashboardCards.map((item, index) => (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3",
            item.bg
          )}
          initial={{ opacity: 0, y: 10 }}
          key={item.title}
          transition={{
            delay: 0.06 + index * 0.06,
            duration: 0.24,
            ease: "easeOut",
          }}
        >
          <span>
            {item.kind === "chat-probe" ? (
              <Brain className="h-4 w-4 text-muted-foreground" />
            ) : item.kind === "review" ? (
              <Zap className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 font-medium text-sm leading-none">
              {item.title}
            </p>
            <p className="text-muted-foreground text-xs">{item.sub}</p>
          </div>
          <Button
            className="shrink-0 gap-1 text-xs"
            onClick={
              item.kind === "chat-probe"
                ? onStartChatProbe
                : item.kind === "review"
                  ? onStartReview
                  : onOpenFlashcards
            }
            type="button"
            variant="outline"
          >
            {item.action}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </m.div>
      ))}
      <p className="mt-1 text-center text-muted-foreground text-xs italic">
        This becomes your home base from here on.
      </p>
    </div>
  );
}
