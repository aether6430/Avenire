"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ResultSet = { chunk: string; score: number; source: string };

const SCENARIOS: {
  query: string;
  label: string;
  vector: ResultSet[];
  bm25: ResultSet[];
  hybrid: ResultSet[];
}[] = [
  {
    query: "why does entropy increase?",
    label: "Conceptual query",
    vector: [
      { chunk: "Boltzmann's equation S = k·ln(W) connects entropy to the number of microstates…", score: 0.91, source: "lecture-oct12.mp4 [frame 4:22]" },
      { chunk: "The statistical interpretation shows that systems spontaneously evolve toward higher probability distributions…", score: 0.87, source: "thermo-notes.md" },
      { chunk: "Macroscopic irreversibility arises from the overwhelming number of disordered microstates…", score: 0.83, source: "ncert-ch12.pdf" },
    ],
    bm25: [
      { chunk: "entropy increases because of the second law of thermodynamics…", score: 0.94, source: "summary.md" },
      { chunk: "the word entropy was coined by Clausius in 1865…", score: 0.61, source: "history.pdf" },
    ],
    hybrid: [
      { chunk: "Boltzmann's equation S = k·ln(W) connects entropy to the number of microstates…", score: 0.93, source: "lecture-oct12.mp4 [frame 4:22]" },
      { chunk: "entropy increases because of the second law of thermodynamics…", score: 0.90, source: "summary.md" },
      { chunk: "The statistical interpretation shows that systems spontaneously evolve toward higher probability distributions…", score: 0.85, source: "thermo-notes.md" },
    ],
  },
  {
    query: "VSPER theory",
    label: "Misspelled identifier",
    vector: [
      { chunk: "VSEPR theory predicts that electron pairs arrange to minimise repulsion…", score: 0.61, source: "chem-notes.md" },
      { chunk: "molecular geometry depends on the number of bonding and lone pairs…", score: 0.58, source: "ncert-ch4.pdf" },
    ],
    bm25: [
      { chunk: "(no match — BM25 requires correct spelling)", score: 0.0, source: "—" },
    ],
    hybrid: [
      { chunk: "VSEPR theory predicts that electron pairs arrange to minimise repulsion…", score: 0.78, source: "chem-notes.md" },
      { chunk: "molecular geometry depends on the number of bonding and lone pairs…", score: 0.61, source: "ncert-ch4.pdf" },
    ],
  },
];

export function HybridSearchDemo() {
  const [scenario, setScenario] = useState(0);
  const [tab, setTab] = useState<"vector" | "bm25" | "hybrid">("vector");
  const s = SCENARIOS[scenario];
  const results = s[tab];

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Hybrid search — compare methods
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        See how vector search, BM25, and hybrid retrieval each handle the same query
        side by side.
      </p>

      {/* Scenario tabs */}
      <div className="mb-4 flex gap-2">
        {SCENARIOS.map((sc, i) => (
          <button type="button"
            key={sc.label}
            onClick={() => { setScenario(i); setTab("vector"); }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-mono transition-all duration-150 ${
              scenario === i
                ? "border-brand bg-brand/10 text-brand"
                : "border-divide bg-neutral-900/55 text-white/55 hover:border-white/30 hover:text-white/80"
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* Query display */}
      <div className="mb-3 rounded-lg border border-divide bg-neutral-950/60 px-4 py-2.5 font-mono text-sm text-white/80">
        &ldquo;{s.query}&rdquo;
      </div>

      {/* Method tabs */}
      <div className="mb-4 flex gap-1">
        {(["vector", "bm25", "hybrid"] as const).map((t) => (
          <button type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-1 text-xs font-mono transition-all duration-150 ${
              tab === t
                ? "border-white/30 bg-white/10 text-white"
                : "border-divide bg-neutral-900/55 text-white/40 hover:border-white/20 hover:text-white/60"
            }`}
          >
            {t === "vector" ? "pgvector" : t === "bm25" ? "BM25" : "hybrid ✓"}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {results.map((r, i) => (
            <motion.div
              key={`${tab}-${r.chunk.slice(0, 30)}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, delay: i * 0.05 }}
              className="rounded-lg border border-divide bg-neutral-950/60 px-4 py-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-mono text-white/40">{r.source}</span>
                <span
                  className={`text-xs font-mono font-semibold ${
                    r.score > 0.8
                      ? "text-brand"
                      : r.score > 0.5
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {r.score > 0 ? r.score.toFixed(2) : "—"}
                </span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{r.chunk}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
