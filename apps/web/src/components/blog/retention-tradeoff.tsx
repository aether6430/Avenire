"use client";

import { useState, useMemo } from "react";

const DECAY = -0.5;
const FACTOR = 19 / 81;

function optimalInterval(stability: number, target: number): number {
  return (stability / FACTOR) * (Math.pow(target, 1 / DECAY) - 1);
}

function formatInterval(days: number): string {
  if (days < 14) return `${Math.round(days)} days`;
  if (days < 60) return `${(days / 7).toFixed(0)} weeks`;
  if (days < 365) return `${(days / 30).toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

const RETENTION_PRESETS = [0.7, 0.75, 0.8, 0.85, 0.9, 0.92, 0.95, 0.97, 0.99];

export function RetentionTradeoff() {
  const [deckSize, setDeckSize] = useState(500);
  const [highlightRow, setHighlightRow] = useState(0.9);

  const rows = useMemo(() => {
    const avgS = 30;
    const baseInterval = optimalInterval(avgS, 0.9);
    return RETENTION_PRESETS.map((r) => {
      const interval = optimalInterval(avgS, r);
      const multiplier = interval / baseInterval;
      const dailyLoad = Math.round(deckSize / interval);
      return { retention: r, interval, multiplier, dailyLoad };
    });
  }, [deckSize]);

  const highlighted = rows.find((r) => r.retention === highlightRow)!;

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6 font-mono text-sm">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-white/45">
        Interactive — Retention vs. Daily Load
      </p>

      <label className="flex flex-col gap-1 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-white/45">
            Deck Size
          </span>
          <span className="text-white/80 font-mono text-xs">{deckSize} cards</span>
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={deckSize}
          onChange={(e) => setDeckSize(Number(e.target.value))}
          className="w-full accent-brand"
        />
      </label>

      <div className="mb-5 space-y-1">
        {rows.map((row) => {
          const isSelected = row.retention === highlightRow;
          const barWidth = Math.min(100, (row.dailyLoad / (deckSize / 5)) * 100);
          return (
            <div
              key={row.retention}
              onClick={() => setHighlightRow(row.retention)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 ${
                isSelected ? "bg-white/5" : "hover:bg-white/[0.03]"
              }`}
            >
              <span
                className={`text-xs min-w-[40px] text-right ${
                  isSelected ? "font-bold text-white" : "text-white/50"
                }`}
              >
                {Math.round(row.retention * 100)}%
              </span>
              <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: isSelected ? "#abc4ff" : "rgba(255,255,255,0.2)",
                  }}
                />
              </div>
              <span
                className={`text-xs min-w-[80px] text-right ${
                  isSelected ? "font-bold text-white" : "text-white/50"
                }`}
              >
                ~{row.dailyLoad} cards/day
              </span>
            </div>
          );
        })}
      </div>

      {highlighted && (
        <div className="rounded-lg border border-divide bg-neutral-950/60 p-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
              Retention
            </div>
            <div className="text-2xl font-bold leading-tight text-white">
              {Math.round(highlighted.retention * 100)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
              Avg Interval
            </div>
            <div className="text-base font-bold leading-tight text-white">
              {formatInterval(highlighted.interval)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
              Daily Load
            </div>
            <div className="text-base font-bold leading-tight text-white">
              ~{highlighted.dailyLoad} cards
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {highlighted.multiplier.toFixed(1)}× the 90% baseline
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-white/40 leading-relaxed">
        Click any row to inspect. Notice how going from 90% → 95% retention roughly
        <strong className="text-white"> doubles</strong> your daily review load.
        The 90% default is the sweet spot: strong memory, manageable workload.
      </p>
    </div>
  );
}
