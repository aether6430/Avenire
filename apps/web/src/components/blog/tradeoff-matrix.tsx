"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const WEEK_SCENARIOS = [
  {
    label: "exam week",
    passive: 80,
    mixed: 15,
    active: 5,
  },
  {
    label: "normal week",
    passive: 50,
    mixed: 30,
    active: 20,
  },
  {
    label: "ideal week",
    passive: 20,
    mixed: 30,
    active: 50,
  },
  {
    label: "active mastery",
    passive: 10,
    mixed: 25,
    active: 65,
  },
];

const BAR_COLORS = {
  passive: "#ef4444",
  mixed: "#f59e0b",
  active: "#22c55e",
};

export function TradeoffMatrix() {
  const [selected, setSelected] = useState(1);
  const s = WEEK_SCENARIOS[selected];

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Study Activity Audit
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        The ratio of passive to active work determines how much you retain.
        Select a scenario to see where your study hours actually go.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {WEEK_SCENARIOS.map((w, i) => (
          <button type="button"
            key={i}
            onClick={() => setSelected(i)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-mono transition-all duration-150 ${
              selected === i
                ? "border-brand bg-brand/10 text-brand"
                : "border-divide bg-neutral-950/40 text-white/50 hover:border-white/30 hover:text-white/80"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(["passive", "mixed", "active"] as const).map((key) => {
          const val = s[key];
          const labels = {
            passive: "Passive (reading, highlighting, watching)",
            mixed: "Mixed (flashcards, review notes)",
            active: "Active (self-test, explain, solve)",
          };
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: BAR_COLORS[key] }}
                  />
                  <span className="text-white/60">{labels[key]}</span>
                </div>
                <span className="font-mono text-white">{val}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: BAR_COLORS[key], opacity: 0.8, transformOrigin: "left" }}
                  animate={{ scaleX: val / 100 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight text */}
      <div className="mt-5 border-divide border-t pt-4">
        <p className="text-xs text-white/40 leading-relaxed">
          {selected === 0 &&
            "Exam week panic mode. Passive work dominates because it feels safer — but this is exactly when active recall matters most. The stress convinces you to reread, when you should be quizzing yourself."}
          {selected === 1 &&
            "The default pattern. Half your time is passive — reading and watching feels productive but builds fragile knowledge. Flipping even 10% from passive to active would double your retention."}
          {selected === 2 &&
            "The aspirational target. Notice that active work still doesn't dominate numerically — but even 50% active is enough to build durable understanding. The rest is necessary exposure."}
          {selected === 3 &&
            "What a truly active study diet looks like. This much retrieval practice is uncomfortable but highly effective. Few students sustain it without a system — which is exactly what [spaced repetition](/blog/apollo) and [retrieval pipelines](/blog/search) are designed to support."}
        </p>
      </div>
    </div>
  );
}
