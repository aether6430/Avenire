"use client";

import {
  Brain,
  CheckCircle as CheckCircle2,
  GraduationCap,
} from "@phosphor-icons/react";
import { m } from "motion/react";

export function WelcomeStep() {
  return (
    <div className="space-y-3">
      {[
        {
          desc: "Avenire turns passive studying into active thinking.",
          icon: <Brain className="h-4 w-4" />,
          label: "Active learning",
        },
        {
          desc: "Know what you know. Fix what you don't.",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "Gap detection",
        },
        {
          desc: "Built for JEE by someone taking JEE.",
          icon: <GraduationCap className="h-4 w-4" />,
          label: "Built in context",
        },
      ].map((item, index) => (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-3xl border border-white/12 bg-white/6 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          initial={{ opacity: 0, y: 10 }}
          key={item.label}
          transition={{
            delay: 0.06 + index * 0.06,
            duration: 0.24,
            ease: "easeOut",
          }}
        >
          <span className="mt-0.5 text-amber-500">{item.icon}</span>
          <div>
            <p className="font-medium text-foreground text-sm leading-none">
              {item.label}
            </p>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {item.desc}
            </p>
          </div>
        </m.div>
      ))}
    </div>
  );
}
