"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SCENARIOS = [
  {
    original: "momentum collisions",
    expansions: [
      "conservation of momentum in elastic and inelastic collisions",
      "linear momentum transfer between colliding objects",
      "impulse-momentum theorem applied to collision problems",
      "how to calculate final velocities after collision",
    ],
    results: [
      { chunk: "In an isolated system, total momentum before collision equals total momentum after collision...", score: 0.94, source: "physics-notes.md" },
      { chunk: "For perfectly inelastic collisions, the objects stick together and move with a common velocity...", score: 0.91, source: "textbook-ch6.pdf" },
      { chunk: "The coefficient of restitution e = (v₂' − v₁') / (v₁ − v₂) determines how 'bouncy' a collision is...", score: 0.87, source: "lecture-sep15.mp4" },
    ],
  },
  {
    original: "photosynthesis dark reaction",
    expansions: [
      "Calvin cycle and carbon fixation in photosynthesis",
      "light-independent reactions of photosynthesis explained",
      "RuBP regeneration and G3P production in the Calvin cycle",
      "how CO2 is converted into glucose in plants",
    ],
    results: [
      { chunk: "The Calvin cycle occurs in the stroma and consists of three phases: carbon fixation, reduction, and RuBP regeneration...", score: 0.95, source: "bio-notes.md" },
      { chunk: "Rubisco catalyzes the attachment of CO₂ to RuBP, forming an unstable 6-carbon intermediate that splits into two 3-PGA molecules...", score: 0.92, source: "ncert-bio-ch13.pdf" },
      { chunk: "For every three CO₂ molecules fixed, the cycle produces one G3P molecule while consuming 9 ATP and 6 NADPH...", score: 0.88, source: "summary.md" },
    ],
  },
  {
    original: "∫",
    expansions: [
      "integral calculus notation and meaning",
      "definite and indefinite integrals",
      "fundamental theorem of calculus integration",
      "how to evaluate integrals symbol ∫",
    ],
    results: [
      { chunk: "The symbol ∫ represents integration — the inverse operation of differentiation. A definite integral ∫ₐᵇ f(x)dx computes the area under the curve...", score: 0.96, source: "math-notes.md" },
      { chunk: "The power rule for integrals states ∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C for n ≠ −1...", score: 0.90, source: "formula-sheet.pdf" },
      { chunk: "Integration by parts: ∫ u dv = uv − ∫ v du. Choose u based on the LIATE rule: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential...", score: 0.85, source: "calculus-review.md" },
    ],
  },
];

export function QueryExpansionDemo() {
  const [scenario, setScenario] = useState(0);
  const [showExpanded, setShowExpanded] = useState(false);
  const s = SCENARIOS[scenario];

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Query Expansion in Action
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        Short study queries often lack the vocabulary used in your notes. Query
        expansion generates rephrasings to bridge the gap — then searches with
        all variants simultaneously.
      </p>

      {/* Scenario tabs */}
      <div className="mb-4 flex gap-2">
        {SCENARIOS.map((sc, i) => (
          <button type="button"
            key={i}
            onClick={() => { setScenario(i); setShowExpanded(false); }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-mono transition-all duration-150 ${
              scenario === i
                ? "border-brand bg-brand/10 text-brand"
                : "border-divide bg-neutral-900/55 text-white/55 hover:border-white/30 hover:text-white/80"
            }`}
          >
            &ldquo;{sc.original}&rdquo;
          </button>
        ))}
      </div>

      {/* Original query */}
      <div className="mb-3">
        <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
          Student query
        </div>
        <div className="rounded-lg border border-divide bg-neutral-950/60 px-4 py-2.5 font-mono text-sm text-white/80">
          &ldquo;{s.original}&rdquo;
        </div>
      </div>

      {/* Expand button */}
      <button type="button"
        onClick={() => setShowExpanded(!showExpanded)}
        className="mb-4 flex items-center gap-2 rounded-lg border border-divide bg-neutral-950/40 px-4 py-2 text-xs font-mono text-white/50 transition-all hover:border-white/30 hover:text-white/80"
      >
        <span className="text-sm">{showExpanded ? "▲" : "▼"}</span>
        {showExpanded ? "Hide expansions" : "Show expansions"}
      </button>

      {/* Expansions */}
      <AnimatePresence>
        {showExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-brand">
              LLM-generated expansions ({s.expansions.length})
            </div>
            <div className="space-y-1.5">
              {s.expansions.map((exp, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-brand/10 bg-brand/[0.03] px-4 py-2 font-mono text-xs text-white/60"
                >
                  &ldquo;{exp}&rdquo;
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
        Retrieved with expansions
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {s.results.map((r, i) => (
            <motion.div
              key={`${scenario}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.08 }}
              className="rounded-lg border border-divide bg-neutral-950/60 px-4 py-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-mono text-white/40">{r.source}</span>
                <span className="text-xs font-mono font-semibold text-brand">
                  {r.score.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{r.chunk}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Without expansion note */}
      <div className="mt-4 rounded-lg border border-dashed border-amber-400/20 bg-amber-400/5 px-4 py-3">
        <p className="text-xs text-amber-400/70 leading-relaxed">
          <strong className="text-amber-400">Without expansion:</strong> A raw
          search for &ldquo;{s.original}&rdquo; would miss chunks that use
          academic vocabulary. The expanded queries fill those gaps — the results
          above were found by matching the <em>expanded</em> forms against your
          notes, not the original 2–3 word query.
        </p>
      </div>

      <p className="mt-3 text-xs text-white/40 leading-relaxed">
        Query expansion runs before any search layer. The original and all
        variants are searched in parallel across vector, lexical, and trigram
        indexes — results are fused and reranked together.
        <span className="block mt-1 text-white/30">
          Try the three scenarios above to see how different query types benefit
          from expansion.
        </span>
      </p>
    </div>
  );
}
