"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import {
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@avenire/ui/components/tooltip";
import type { Route } from "next";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { setWorkspacePaneDragData } from "@/lib/workspace-panes";

export function SectionButton({
  dragHref,
  icon: Icon,
  description,
  label,
  size = "default",
  onClick,
  onContextMenu,
}: {
  dragHref?: Route;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  label: string;
  size?: "default" | "lg";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        draggable={Boolean(dragHref)}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDragStart={(event) => {
          if (!dragHref) {
            return;
          }

          setWorkspacePaneDragData(event.dataTransfer, dragHref);
        }}
        size={size}
      >
        <Icon className="size-4" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs">{label}</p>
          {description ? (
            <p className="truncate text-[10px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarEmptyState({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Empty className="min-h-[7.5rem] rounded-2xl border-border/50 bg-background/60 px-3 py-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="size-4" />
        </EmptyMedia>
        <EmptyTitle className="text-xs">{title}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent className="max-w-none">
        <EmptyDescription className="text-[11px] leading-relaxed">
          {description}
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}

export function SectionHeader({
  actions,
  title,
}: {
  actions?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      {actions ? (
        <div className="flex items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}

export function SectionIconAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
