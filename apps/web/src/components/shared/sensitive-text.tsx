"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SensitiveText({
  value,
  privacyMode,
  className,
  fallback = "—",
}: {
  value?: string | null;
  privacyMode: boolean;
  className?: string;
  fallback?: string;
}) {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);

  if (!value) {
    return <span className={className}>{fallback}</span>;
  }

  const shouldHide = privacyMode && isEmailAddress(value);

  if (!shouldHide || revealedValue === value) {
    return <span className={className}>{value}</span>;
  }

  return (
    <button
      className={cn(
        "max-w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left",
        className
      )}
      onClick={() => setRevealedValue(value)}
      title="Click to reveal"
      type="button"
    >
      <span className="inline-block max-w-full select-none truncate blur-[6px]">
        {value}
      </span>
    </button>
  );
}
