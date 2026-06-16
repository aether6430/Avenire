"use client";

import { useState, useMemo } from "react";

const DECAY = -0.5;
const FACTOR = 19 / 81;

function optimalInterval(stability: number, target: number): number {
  return (stability / FACTOR) * (Math.pow(target, 1 / DECAY) - 1);
}

function formatInterval(days: number): string {
  if (days < 1) return `${Math.round(days * 24)} hours`;
  if (days < 14) return `${Math.round(days)} days`;
  if (days < 60) return `${(days / 7).toFixed(1)} weeks`;
  if (days < 365) return `${(days / 30).toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

function simulateReviews(
  initialS: number,
  n: number,
  target: number,
): { review: number; stability: number; interval: number; totalDays: number }[] {
  const rows: { review: number; stability: number; interval: number; totalDays: number }[] = [];
  let s = initialS;
  let totalDays = 0;
  for (let i = 1; i <= n; i++) {
    const interval = optimalInterval(s, target);
    totalDays += interval;
    const r = target;
    const sNew =
      s *
      (Math.exp(0.9) *
        (11 - 5) *
        Math.pow(s, -0.14) *
        (Math.exp(0.2 * (1 - r)) - 1) +
        1);
    rows.push({
      review: i,
      stability: parseFloat(s.toFixed(2)),
      interval: parseFloat(interval.toFixed(1)),
      totalDays: parseFloat(totalDays.toFixed(1)),
    });
    s = Math.min(sNew, 365 * 5);
  }
  return rows;
}

const INITIAL_S_BY_RATING: Record<string, number> = {
  again: 0.4,
  hard: 1.3,
  good: 3.1,
  easy: 7.9,
};

export function IntervalCalculator() {
  const [firstRating, setFirstRating] = useState<"again" | "hard" | "good" | "easy">("good");
  const [target, setTarget] = useState(0.9);
  const [numReviews, setNumReviews] = useState(8);

  const rows = useMemo(
    () => simulateReviews(INITIAL_S_BY_RATING[firstRating], numReviews, target),
    [firstRating, target, numReviews],
  );

  const ratingColors: Record<string, string> = {
    again: "#ef4444",
    hard: "#f59e0b",
    good: "#22c55e",
    easy: "#abc4ff",
  };

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6 font-mono text-sm">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-white/45">
        FSRS Interval Growth — Calculator
      </p>

      <div className="mb-5 flex flex-wrap items-end gap-6">
        {/* Rating picker */}
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-white/45">
            First Rating
          </div>
          <div className="flex gap-1.5">
            {(["again", "hard", "good", "easy"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFirstRating(r)}
                className={`rounded-lg border px-3 py-1.5 text-xs tracking-wider capitalize font-mono transition-all ${
                  firstRating === r
                    ? "text-neutral-950 border-transparent"
                    : "bg-transparent text-white/50 border-white/20 hover:border-white/40 hover:text-white/80"
                }`}
                style={{
                  backgroundColor: firstRating === r ? ratingColors[r] : undefined,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Target retention */}
        <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <span className="text-[10px] uppercase tracking-widest text-white/45">
            Target — {Math.round(target * 100)}%
          </span>
          <input
            type="range"
            min={0.7}
            max={0.99}
            step={0.01}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="accent-brand"
          />
        </label>

        {/* Review count */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-white/45">
            Reviews
          </span>
          <input
            type="number"
            min={3}
            max={15}
            value={numReviews}
            onChange={(e) =>
              setNumReviews(Math.max(3, Math.min(15, Number(e.target.value))))
            }
            className="w-16 rounded-lg border border-white/20 bg-neutral-950/60 px-2 py-1.5 font-mono text-xs text-white"
          />
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {["Review #", "Stability", "Interval", "Cumulative"].map((h) => (
                <th
                  key={h}
                  className="text-left p-2 border-b-2 border-white/20 font-semibold text-white/45 uppercase tracking-widest text-[10px]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "" : "bg-white/[0.02]"}>
                <td className="p-2 border-b border-white/5">
                  <span
                    className="font-semibold"
                    style={{ color: ratingColors[firstRating] }}
                  >
                    #{row.review}
                  </span>
                </td>
                <td className="p-2 border-b border-white/5 text-white/70">
                  {row.stability}d
                </td>
                <td className="p-2 border-b border-white/5 font-semibold text-white">
                  {formatInterval(row.interval)}
                </td>
                <td className="p-2 border-b border-white/5 text-white/40">
                  {formatInterval(row.totalDays)} total
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[10px] text-white/30">
          <span>Review 1</span>
          <span>Review {numReviews}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
          {rows.map((row, i) => {
            const maxInterval = rows[rows.length - 1]?.interval ?? 1;
            const width = (row.interval / maxInterval) * (100 / numReviews);
            return (
              <div
                key={i}
                className="h-full transition-all duration-300"
                style={{
                  width: `${100 / numReviews}%`,
                  backgroundColor: ratingColors[firstRating],
                  opacity: 0.3 + (i / numReviews) * 0.7,
                }}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-white/40 leading-relaxed">
        Notice how a card first rated <strong className="text-white">Easy</strong> vs{" "}
        <strong className="text-white">Hard</strong> diverges dramatically after
        just a few reviews. The algorithm naturally calibrates to each card's
        intrinsic difficulty — which is why that first honest rating matters so much.
      </p>
    </div>
  );
}
