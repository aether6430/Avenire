"use client";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@avenire/ui/components/empty";
import { ListChecks } from "@phosphor-icons/react";

export function TaskEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Empty className="min-h-[14rem] rounded-2xl border border-dashed border-border/70 bg-card/70">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListChecks className="size-4" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
