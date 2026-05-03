"use client";

import type { ReactNode } from "react";
import { useAuthTypingImpulse } from "@/components/auth-shell";
import {
  bumpParticleTypingImpulse,
  pulseParticleSubmitImpulse,
} from "@/components/ui/particle-field";
import { cn } from "@/lib/utils";

export function ParticleFormFrame({
  children,
  className,
  footer,
}: {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  const typingImpulse = useAuthTypingImpulse();

  return (
    <div
      className={cn(
        "w-full",
        className
      )}
      onKeyDownCapture={(event) => {
        bumpParticleTypingImpulse(typingImpulse, event);
      }}
      onSubmitCapture={() => {
        pulseParticleSubmitImpulse(typingImpulse);
      }}
    >
      {children}
      {footer ? (
        <div className="px-5 pt-4 text-center text-xs text-muted-foreground sm:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
