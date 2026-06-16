"use client";

import { useState } from "react";

type Rating = 1 | 2 | 3 | 4;
type CardState = "New" | "Learning" | "Review" | "Relearning";

interface CardMemState {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: CardState;
  interval: number;
}

const INITIAL_S: Record<Rating, number> = { 1: 0.4, 2: 1.3, 3: 3.1, 4: 7.9 };
const INITIAL_D: Record<Rating, number> = { 1: 7.2, 2: 5.9, 3: 4.4, 4: 2.9 };

const DECAY = -0.5;
const FACTOR = 19 / 81;

function optimalInterval(s: number, target: number) {
  return (s / FACTOR) * (Math.pow(target, 1 / DECAY) - 1);
}

function updateDifficulty(d: number, rating: Rating): number {
  const w6 = 0.1;
  const w7 = 0.1;
  const d0 = INITIAL_D[3];
  let newD = d - w6 * (rating - 3);
  newD = d0 * w7 + newD * (1 - w7);
  return Math.max(1, Math.min(10, newD));
}

function stabilityOnRecall(s: number, d: number, r: number, rating: Rating): number {
  const hardPenalty = rating === 2 ? 0.8 : 1;
  const easyBonus = rating === 4 ? 1.3 : 1;
  const inc = Math.exp(0.9) * (11 - d) * Math.pow(s, -0.14) * (Math.exp(0.2 * (1 - r)) - 1) * hardPenalty * easyBonus + 1;
  return Math.min(s * inc, 365 * 3);
}

function stabilityOnLapse(s: number, d: number, r: number): number {
  return Math.max(0.1, 0.5 * Math.pow(d, -0.33) * (Math.pow(s + 1, 0.9) - 1) * Math.exp(0.3 * (1 - r)));
}

const TARGET = 0.9;

const RATING_LABELS: Record<Rating, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };
const RATING_COLORS: Record<Rating, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#22c55e",
  4: "#abc4ff",
};

interface HistoryEntry {
  ratingLabel: string;
  ratingNum: Rating;
  stabilityBefore: number;
  stabilityAfter: number;
  difficultyAfter: number;
  interval: number;
}

const initialState: CardMemState = {
  stability: 0,
  difficulty: 5,
  reps: 0,
  lapses: 0,
  state: "New",
  interval: 0,
};

export function ReviewSimulator() {
  const [card, setCard] = useState<CardMemState>(initialState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleRate = (rating: Rating) => {
    let newCard: CardMemState;

    if (card.state === "New") {
      const s = INITIAL_S[rating];
      const d = INITIAL_D[rating];
      const interval = rating === 1 ? 0 : parseFloat(optimalInterval(s, TARGET).toFixed(1));
      newCard = {
        stability: s,
        difficulty: d,
        reps: 1,
        lapses: rating === 1 ? 1 : 0,
        state: rating === 1 ? "Learning" : "Review",
        interval,
      };
      setHistory([{
        ratingLabel: RATING_LABELS[rating],
        ratingNum: rating,
        stabilityBefore: 0,
        stabilityAfter: s,
        difficultyAfter: d,
        interval,
      }]);
    } else {
      const sBefore = card.stability;
      const r = TARGET;
      let sAfter: number;
      let newLapses = card.lapses;
      let newState: CardState = card.state;

      if (rating === 1) {
        sAfter = stabilityOnLapse(sBefore, card.difficulty, r);
        newLapses++;
        newState = "Relearning";
      } else {
        sAfter = stabilityOnRecall(sBefore, card.difficulty, r, rating);
        newState = "Review";
      }

      const newD = updateDifficulty(card.difficulty, rating);
      const interval = rating === 1 ? 0 : parseFloat(optimalInterval(sAfter, TARGET).toFixed(1));

      newCard = {
        stability: parseFloat(sAfter.toFixed(2)),
        difficulty: parseFloat(newD.toFixed(2)),
        reps: card.reps + 1,
        lapses: newLapses,
        state: newState,
        interval,
      };

      setHistory((prev) => [{
        ratingLabel: RATING_LABELS[rating],
        ratingNum: rating,
        stabilityBefore: parseFloat(sBefore.toFixed(2)),
        stabilityAfter: parseFloat(sAfter.toFixed(2)),
        difficultyAfter: parseFloat(newD.toFixed(2)),
        interval,
      }, ...prev].slice(0, 10));
    }

    setCard(newCard);
  };

  const handleReset = () => {
    setCard(initialState);
    setHistory([]);
  };

  const previewIntervals = ([1, 2, 3, 4] as Rating[]).map((rating) => {
    if (card.state === "New") {
      const s = INITIAL_S[rating];
      return { rating, interval: rating === 1 ? 0 : optimalInterval(s, TARGET) };
    }
    const r = TARGET;
    let sAfter: number;
    if (rating === 1) {
      sAfter = stabilityOnLapse(card.stability, card.difficulty, r);
    } else {
      sAfter = stabilityOnRecall(card.stability, card.difficulty, r, rating);
    }
    return { rating, interval: rating === 1 ? 0 : optimalInterval(sAfter, TARGET) };
  });

  function formatInterval(days: number): string {
    if (days === 0) return "now";
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 14) return `${Math.round(days)}d`;
    if (days < 60) return `${(days / 7).toFixed(1)}w`;
    if (days < 365) return `${(days / 30).toFixed(1)}mo`;
    return `${(days / 365).toFixed(1)}y`;
  }

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6 font-mono text-sm">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-white/45">
        Interactive — Card State Simulator (FSRS)
      </p>

      {/* Card display */}
      <div className="mb-5 rounded-lg border border-divide bg-neutral-950/60 p-5">
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/40">
          {card.state} · {card.reps} rep{card.reps !== 1 ? "s" : ""} · {card.lapses} lapse{card.lapses !== 1 ? "s" : ""}
        </div>
        <div className="text-sm text-white/80 leading-relaxed">
          {card.state === "New"
            ? "What is the spacing effect?"
            : `S = ${card.stability}d  ·  D = ${card.difficulty}  ·  Next in ${formatInterval(card.interval)}`}
        </div>
        {card.state !== "New" && (
          <div className="mt-3 flex gap-3">
            <div className="flex-1">
              <div className="text-[10px] text-white/40 mb-1">Stability</div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{
                    width: `${Math.min(100, (card.stability / 365) * 100)}%`,
                    backgroundColor: "#abc4ff",
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-white/40 mb-1">Difficulty</div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{
                    width: `${(card.difficulty / 10) * 100}%`,
                    backgroundColor: "#ef4444",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rating buttons */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {([1, 2, 3, 4] as Rating[]).map((rating) => {
          const preview = previewIntervals.find((p) => p.rating === rating)!;
          return (
            <button
              key={rating}
              onClick={() => handleRate(rating)}
              className="flex flex-col items-center rounded-lg border-2 bg-neutral-950/40 px-2 py-3 font-mono transition-all hover:opacity-80"
              style={{ borderColor: RATING_COLORS[rating] }}
            >
              <span className="text-xs font-bold" style={{ color: RATING_COLORS[rating] }}>
                {RATING_LABELS[rating]}
              </span>
              <span className="mt-1 text-[10px] text-white/40">
                {formatInterval(preview.interval)}
              </span>
            </button>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mb-2">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">
            Review History
          </div>
          <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg p-2 text-[10px] ${
                  i === 0 ? "bg-white/5" : ""
                }`}
              >
                <span className="font-semibold min-w-[50px]" style={{ color: RATING_COLORS[h.ratingNum] }}>
                  {h.ratingLabel}
                </span>
                <span className="text-white/40">
                  S: {h.stabilityBefore}→<strong className="text-white/80">{h.stabilityAfter}d</strong>
                </span>
                <span className="text-white/40">D: {h.difficultyAfter}</span>
                <span className="text-white/80 font-semibold">{formatInterval(h.interval)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="rounded-lg border border-divide bg-neutral-900 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          Reset Card
        </button>
      </div>

      <p className="mt-3 text-xs text-white/40 leading-relaxed">
        Rate the card as if you're studying. Watch how stability grows with each
        Good/Easy and collapses (but not to zero) on a lapse. The interval shown
        under each button is a live preview of what would happen.
      </p>
    </div>
  );
}
