"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avenire/ui/components/card";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ChatSpinnerGlyph } from "@/components/chat/spinner";

export function ToolRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-1 flex items-baseline gap-2 text-sm"
      initial={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <span className="font-semibold text-foreground/72">{label}</span>
      {children}
    </motion.div>
  );
}

export function ToolPending({ label }: { label: string }) {
  return (
    <ToolRow label={label}>
      <span className="font-mono text-[11px] text-foreground/28">
        running...
      </span>
    </ToolRow>
  );
}

export function ToolPendingCard({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <Card className="mb-2 max-w-[28rem] border-border/40 bg-card/90" size="sm">
      <CardHeader className="gap-0.5">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="font-mono text-[11px]">{label}</span>
            <ChatSpinnerGlyph className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/35 bg-muted/30 px-3 py-2 font-mono text-[11px] text-foreground/48">
          {title}
        </div>
      </CardContent>
    </Card>
  );
}

export function ToolError({
  errorText,
  label,
}: {
  errorText: string;
  label: string;
}) {
  return (
    <ToolRow label={label}>
      <span className="font-mono text-[12px] text-destructive/80">
        {errorText}
      </span>
    </ToolRow>
  );
}
