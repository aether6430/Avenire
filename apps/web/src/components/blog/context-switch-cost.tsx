"use client";
import { useState } from "react";

const TOOLS = [
  { id: "pdf", label: "PDF Reader", cost: 12 },
  { id: "notes", label: "Notes App", cost: 10 },
  { id: "chat", label: "ChatGPT / AI", cost: 15 },
  { id: "flashcards", label: "Flashcard App", cost: 8 },
  { id: "browser", label: "YouTube / Browser", cost: 18 },
  { id: "todo", label: "To-Do List", cost: 6 },
  { id: "ebook", label: "Digital Textbook", cost: 10 },
  { id: "anki", label: "Anki / Review App", cost: 9 },
];

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export function ContextSwitchCost() {
  const [sessionLength, setSessionLength] = useState(120);
  const [activeTools, setActiveTools] = useState<string[]>(["pdf", "notes", "chat", "flashcards"]);
  const [switchInterval, setSwitchInterval] = useState(8);

  const toggle = (id: string) => {
    setActiveTools((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toolCount = activeTools.length;
  const switchCount = toolCount > 0 ? Math.floor(sessionLength / switchInterval) : 0;
  const attentionResidueCost = 23; // seconds per switch (average)
  const reorientationCost = 17; // seconds per switch
  const totalWasteSeconds = switchCount * (attentionResidueCost + reorientationCost);
  const totalWasteMinutes = totalWasteSeconds / 60;
  const productiveMinutes = sessionLength - totalWasteMinutes;
  const wastePercent = (totalWasteMinutes / sessionLength) * 100;

  const totalToolCost = activeTools.reduce((sum, id) => {
    const tool = TOOLS.find((t) => t.id === id);
    return sum + (tool?.cost ?? 0);
  }, 0);

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6 font-mono text-sm">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
        Context Switch Cost Calculator
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        Every time you switch between study tools, your brain leaves "attention
        residue" on the previous task. Add up the tools you use in a typical
        session and see how much time you actually lose.
      </p>

      {/* Tool selector */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
          Tools you use in a study session
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((tool) => {
            const isActive = activeTools.includes(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => toggle(tool.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                  isActive
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-divide bg-neutral-950/40 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                {tool.label}
                {isActive && (
                  <span className="ml-1.5 text-[10px] text-white/40">
                    ({tool.cost}s)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session controls */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/45">
              Session length
            </span>
            <span className="text-white text-xs">{formatTime(sessionLength)}</span>
          </div>
          <input
            type="range"
            min={30}
            max={240}
            step={10}
            value={sessionLength}
            onChange={(e) => setSessionLength(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </label>

        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/45">
              Avg time between switches
            </span>
            <span className="text-white text-xs">{switchInterval} min</span>
          </div>
          <input
            type="range"
            min={2}
            max={30}
            step={1}
            value={switchInterval}
            onChange={(e) => setSwitchInterval(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </label>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-divide bg-neutral-950/60 p-5">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              Switches
            </div>
            <div className="text-2xl font-bold text-white">{switchCount}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              Time wasted
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {formatTime(totalWasteMinutes)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              Productive time
            </div>
            <div className="text-2xl font-bold text-brand">
              {formatTime(productiveMinutes)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              Waste %
            </div>
            <div className="text-2xl font-bold text-white">
              {wastePercent.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Waste bar */}
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(100, wastePercent)}%`,
              background: `linear-gradient(90deg, #f59e0b, #ef4444)`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/30">
          <span>0% wasted</span>
          <span>100% wasted</span>
        </div>

        {/* Breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] text-white/30">Attention residue</div>
            <div className="text-xs text-white/70">{attentionResidueCost}s per switch</div>
            <div className="text-[10px] text-white/40">
              Your brain lingers on the previous task
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] text-white/30">Reorientation</div>
            <div className="text-xs text-white/70">{reorientationCost}s per switch</div>
            <div className="text-[10px] text-white/40">
              "Wait, what was I doing?"
            </div>
          </div>
        </div>
      </div>

      {/* Per-tool cost breakdown */}
      {activeTools.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
            Cognitive load by tool
          </p>
          <div className="space-y-1">
            {TOOLS.filter((t) => activeTools.includes(t.id))
              .sort((a, b) => b.cost - a.cost)
              .map((tool) => {
                const maxCost = Math.max(...TOOLS.map((t) => t.cost));
                return (
                  <div key={tool.id} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-white/50">{tool.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(tool.cost / maxCost) * 100}%`,
                          backgroundColor:
                            tool.cost > 14
                              ? "#ef4444"
                              : tool.cost > 10
                                ? "#f59e0b"
                                : "#22c55e",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="w-8 text-[10px] text-white/40 text-right">
                      {tool.cost}s
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-white/40 leading-relaxed">
        Based on research by Mark et al. (2005) and Adler & Benbunan-Fich (2012)
        on task switching costs. A typical study session with 4+ tools can waste
        25–40% of total time to context switching overhead — before you even
        account for the knowledge fragmentation.
      </p>
    </div>
  );
}
