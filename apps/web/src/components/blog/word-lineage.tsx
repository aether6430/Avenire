"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const LINEAGE = [
  {
    word: "avenire",
    lang: "Latin",
    meaning: "to come to pass",
    note: "Classical root. The verb from which futures were named.",
  },
  {
    word: "avenir",
    lang: "French",
    meaning: "the future; what is yet to come",
    note: "Still in use. The forward-facing shadow of the Latin root.",
  },
  {
    word: "avenoir",
    lang: "Invented",
    meaning: "the desire to see your memories from the outside",
    note: "From The Dictionary of Obscure Sorrows. The word that started everything.",
  },
  {
    word: "Avenire",
    lang: "English / brand",
    meaning: "what is yet to come — yours, specifically",
    note: "Found in the gap between languages. Neither here nor there, which is exactly where it belongs.",
  },
];

const ORBIT_WORDS = [
  { word: "reverie", angle: 30 },
  { word: "aether", angle: 90 },
  { word: "avenoir", angle: 150 },
  { word: "avenir", angle: 210 },
  { word: "adventure", angle: 270 },
  { word: "advent", angle: 330 },
];

export function WordLineage() {
  const [step, setStep] = useState(0);
  const current = LINEAGE[step];

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-4 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Etymology — trace the lineage
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Step-through lineage */}
        <div>
          <div className="mb-4 flex gap-1.5">
            {LINEAGE.map((item, i) => (
              <button type="button"
                key={item.word}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                  i <= step ? "bg-brand" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-2"
            >
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/40">
                {current.lang}
              </p>
              <p className="font-mono text-2xl text-white italic">{current.word}</p>
              <p className="text-sm text-white/55 leading-relaxed">
                &ldquo;{current.meaning}&rdquo;
              </p>
              <p className="text-xs text-white/40 leading-relaxed">{current.note}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between">
            <button type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-xs text-white/40 transition-colors hover:text-white disabled:opacity-20"
            >
              ← prev
            </button>
            <span className="text-xs font-mono text-white/30">
              {step + 1} / {LINEAGE.length}
            </span>
            <button type="button"
              onClick={() => setStep((s) => Math.min(LINEAGE.length - 1, s + 1))}
              disabled={step === LINEAGE.length - 1}
              className="text-xs text-white/40 transition-colors hover:text-white disabled:opacity-20"
            >
              next →
            </button>
          </div>
        </div>

        {/* Orbit diagram */}
        <svg viewBox="0 0 200 200" className="w-full">
          {/* Background */}
          <rect x="0" y="0" width="200" height="200" className="fill-neutral-950" rx="8" />
          {/* Orbit ring */}
          <circle
            cx="100" cy="100" r="72"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"
            strokeDasharray="3 4"
          />
          {/* Center */}
          <circle cx="100" cy="100" r="22" className="fill-neutral-900 stroke-brand" strokeWidth="1.2" />
          <text x="100" y="97" textAnchor="middle" fill="#abc4ff" fontSize="8" fontFamily="ui-monospace, monospace" fontWeight="600">
            Avenire
          </text>
          <text x="100" y="107" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="ui-monospace, monospace">
            brand
          </text>
          {/* Satellites */}
          {ORBIT_WORDS.map(({ word, angle }) => {
            const rad = (angle * Math.PI) / 180;
            const x = 100 + 72 * Math.cos(rad);
            const y = 100 + 72 * Math.sin(rad);
            const isHighlighted = LINEAGE[step].word === word;
            return (
              <g key={word}>
                <line
                  x1="100" y1="100" x2={x} y2={y}
                  stroke={isHighlighted ? "#abc4ff" : "rgba(255,255,255,0.12)"}
                  strokeWidth={isHighlighted ? "0.8" : "0.4"}
                />
                <circle
                  cx={x} cy={y} r="16"
                  className={isHighlighted ? "fill-brand/15" : "fill-neutral-950"}
                  stroke={isHighlighted ? "#abc4ff" : "rgba(255,255,255,0.12)"}
                  strokeWidth={isHighlighted ? "1" : "0.6"}
                />
                <text
                  x={x} y={y + 4} textAnchor="middle"
                  fill={isHighlighted ? "#abc4ff" : "rgba(255,255,255,0.45)"}
                  fontSize="6.5" fontFamily="ui-monospace, monospace"
                >
                  {word}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
