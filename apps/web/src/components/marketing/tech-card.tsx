"use client";
import type React from "react";
import { cn } from "@/lib/utils";
import { DivideX } from "./divide";

export const Card = ({
  title,
  subtitle,
  logo,
  cta,
  tone,
  className,
  delay = 0,
}: {
  title: string;
  subtitle: string;
  logo: React.ReactNode;
  cta: React.ReactNode;
  tone: "default" | "danger" | "success";
  className?: string;
  delay?: number;
}) => {
  return (
    <div
      className={cn(
        "group/tech-card relative h-full text-xs [animation-delay:var(--tech-card-delay)] [animation-duration:500ms] [animation-fill-mode:both] [animation-name:avenire-tech-card-enter] [animation-timing-function:ease-out]",
        className
      )}
      style={
        {
          "--tech-card-delay": `${delay}s`,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 z-10 m-auto h-full w-full rounded-lg border border-(--pattern-fg) bg-[image:repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-white bg-fixed dark:bg-neutral-900" />
      <div className="absolute inset-x-0 -top-1.5 mx-auto size-3 rounded-full border-2 border-gray-300 bg-white dark:border-neutral-700 dark:bg-neutral-900" />

      <div className="relative z-20 flex w-54 shrink-0 flex-col items-start rounded-lg bg-white shadow-aceternity transition-transform duration-300 ease-out group-hover/tech-card:translate-x-1 group-hover/tech-card:-translate-y-1 group-hover/tech-card:translate-y-1 dark:bg-neutral-900">
        <div className="flex w-full items-center justify-between p-2 md:p-4">
          <div className="flex items-center gap-2 font-medium">
            {logo}
            {title}
          </div>
          <p className="font-mono text-gray-600">{subtitle}</p>
        </div>
        <DivideX />
        <div
          className={cn(
            "m-4 rounded-sm border px-2 py-0.5",
            tone === "default" &&
              "border-brand/70 bg-brand/10 text-brand dark:bg-brand/10/10 dark:text-brand",
            tone === "danger" &&
              "border-orange-500 bg-red-50 text-orange-500 dark:bg-red-50/10 dark:text-red-500",
            tone === "success" &&
              "border-neutral-500 bg-neutral-50 text-neutral-500 dark:bg-neutral-50/10 dark:text-neutral-500"
          )}
        >
          {cta}
        </div>
      </div>
    </div>
  );
};
