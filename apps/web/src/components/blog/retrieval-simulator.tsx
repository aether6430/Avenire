"use client";
import { useState } from "react";

type StudyMethod = {
  id: string;
  label: string;
  tag: string;
  retention1d: number;
  retention7d: number;
  retention30d: number;
  description: string;
  color: string;
};

const METHODS: StudyMethod[] = [
  {
    id: "rereading",
    label: "Rereading / Highlighting",
    tag: "Passive",
    retention1d: 0.35,
    retention7d: 0.12,
    retention30d: 0.04,
    description: "Feels productive because you're doing something. But recognizing text is not the same as retrieving it. Most of the content is gone within a week.",
    color: "#ef4444",
  },
  {
    id: "watching",
    label: "Watching a Lecture",
    tag: "Passive",
    retention1d: 0.50,
    retention7d: 0.20,
    retention30d: 0.08,
    description: "Clear explanations create a fluency illusion — you understand the lecturer's explanation, not your own. Without active processing, retention drops fast.",
    color: "#f59e0b",
  },
  {
    id: "notes",
    label: "Reviewing Notes",
    tag: "Mixed",
    retention1d: 0.55,
    retention7d: 0.28,
    retention30d: 0.12,
    description: "Better than rereading if notes are well-structured, but still passive. The notes are a crutch — you're recognizing, not reconstructing.",
    color: "#a855f7",
  },
  {
    id: "flashcards",
    label: "Flashcards (Spaced)",
    tag: "Mixed",
    retention1d: 0.70,
    retention7d: 0.50,
    retention30d: 0.35,
    description: "Active recall with spacing — significantly better. But pre-made cards test recognition of the card's format, not deep understanding.",
    color: "#06b6d4",
  },
  {
    id: "selftest",
    label: "Self-Testing (No Notes)",
    tag: "Active",
    retention1d: 0.80,
    retention7d: 0.62,
    retention30d: 0.48,
    description: "Forcing yourself to retrieve without cues builds durable memory. The struggle is the point — each retrieval strengthens the trace.",
    color: "#22c55e",
  },
  {
    id: "explain",
    label: "Explaining to Someone",
    tag: "Active",
    retention1d: 0.88,
    retention7d: 0.72,
    retention30d: 0.58,
    description: "The Feynman technique in action. Explaining forces you to fill gaps, rephrase, and connect ideas — the highest retention of any method.",
    color: "#abc4ff",
  },
];

export function RetrievalSimulator() {
  const [selected, setSelected] = useState<string[]>([]);
  const [days, setDays] = useState(7);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const visible = METHODS.filter((m) => selected.includes(m.id));

  const retentionAt = (method: StudyMethod, day: number) => {
    if (day <= 1) {
      const t = day / 1;
      return method.retention1d * t + 1 * (1 - t);
    }
    if (day <= 7) {
      const t = (day - 1) / 6;
      return method.retention7d * t + method.retention1d * (1 - t);
    }
    const t = (day - 7) / 23;
    return method.retention30d * t + method.retention7d * (1 - t);
  };

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Study Method — Retention Simulator
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        Select one or more study methods to compare how retention decays over time.
        The gap between passive and active methods is the cost of the fluency illusion.
      </p>

      {/* Method selector */}
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {METHODS.map((m) => {
          const isOn = selected.includes(m.id);
          return (
            <button type="button"
              key={m.id}
              onClick={() => toggle(m.id)}
              aria-pressed={isOn}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ${
                isOn
                  ? "border-white/30 bg-white/5"
                  : "border-divide bg-neutral-950/40 text-white/40 hover:border-white/20"
              }`}
            >
              <div
                className={`h-3 w-3 shrink-0 rounded-full border-2 transition-all ${
                  isOn ? "border-white" : "border-white/20"
                }`}
                style={{ backgroundColor: isOn ? m.color : "transparent" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={isOn ? "text-white" : "text-white/60"}>
                    {m.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      m.tag === "Active"
                        ? "bg-brand/10 text-brand"
                        : m.tag === "Mixed"
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-white/5 text-white/40"
                    }`}
                  >
                    {m.tag}
                  </span>
                </div>
                {isOn && (
                  <p className="mt-1 text-xs text-white/40 leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* If nothing selected, show hint */}
      {selected.length === 0 && (
        <div className="mb-5 rounded-lg border border-dashed border-divide bg-neutral-950/40 px-4 py-8 text-center text-sm text-white/30">
          Select at least one study method above to see its retention curve
        </div>
      )}

      {/* Chart */}
      {visible.length > 0 && (
        <div className="mb-5">
          {/* Day slider */}
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-white/45 font-mono">Time elapsed</span>
            <span className="text-white font-mono">
              {days} day{days !== 1 ? "s" : ""}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Time elapsed in days"
            className="mb-5 w-full accent-brand"
          />

          {/* Retention bars */}
          <div className="space-y-2">
            {visible
              .sort((a, b) => retentionAt(b, days) - retentionAt(a, days))
              .map((m) => {
                const r = retentionAt(m, days);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span
                      className="min-w-[8px] text-xs text-right font-mono"
                      style={{ color: m.color }}
                    >
                      {Math.round(r * 100)}%
                    </span>
                    <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${Math.max(2, r * 100)}%`,
                          backgroundColor: m.color,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <span className="min-w-[80px] text-xs text-white/40 text-right">
                      {m.label.split("/")[0].trim()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quick-select presets */}
      <div className="border-divide border-t pt-4">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-white/30">
          Quick compare
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button"
            onClick={() => setSelected(["rereading", "selftest"])}
            className="rounded-lg border border-divide px-3 py-1.5 text-xs font-mono text-white/50 transition-all hover:border-white/30 hover:text-white/80"
          >
            Passive vs Active
          </button>
          <button type="button"
            onClick={() => setSelected(["rereading", "watching", "flashcards", "explain"])}
            className="rounded-lg border border-divide px-3 py-1.5 text-xs font-mono text-white/50 transition-all hover:border-white/30 hover:text-white/80"
          >
            Full spectrum
          </button>
          <button type="button"
            onClick={() => setSelected(["notes", "flashcards", "selftest", "explain"])}
            className="rounded-lg border border-divide px-3 py-1.5 text-xs font-mono text-white/50 transition-all hover:border-white/30 hover:text-white/80"
          >
            Best methods
          </button>
          <button type="button"
            onClick={() => setSelected([])}
            className="rounded-lg border border-divide px-3 py-1.5 text-xs font-mono text-white/30 transition-all hover:text-white/60"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/40 leading-relaxed">
        Drag the slider to see retention at different intervals. Active methods
        (self-testing, explaining) consistently outperform passive ones (rereading,
        watching) — and the gap <em>grows</em> over time.
      </p>
    </div>
  );
}
