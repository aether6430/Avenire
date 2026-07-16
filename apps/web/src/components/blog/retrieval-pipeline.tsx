"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  {
    id: "query",
    label: "Student query",
    detail: "\"why does the photoelectric effect disprove the wave model?\"",
    note: "Short, informal, conceptual. A text-only index will miss chunks that use different vocabulary.",
    color: "text-brand",
  },
  {
    id: "expand",
    label: "Query expansion",
    detail: "Apollo generates 3–5 rephrasing variants via LLM",
    note: "\"quantum of light\", \"photon energy threshold\", \"wave-particle duality\" — now we search with the full semantic surface.",
    color: "text-brand",
  },
  {
    id: "vector",
    label: "Vector search (pgvector)",
    detail: "Top-K candidates by cosine similarity across all embedded chunks",
    note: "Fast approximate nearest-neighbour search across text pages, PDFs — all in the same embedding space.",
    color: "text-sky-400",
  },
  {
    id: "bm25",
    label: "BM25 lexical search",
    detail: "Exact-term matching runs in parallel with vector search",
    note: "Catches specific identifiers, course codes, and terminology the embedding model compressed away.",
    color: "text-amber-400",
  },
  {
    id: "rerank",
    label: "Rerank (cross-encoder)",
    detail: "Cross-encoder scores query ↔ each candidate together",
    note: "The bi-encoder embedding gives you fast candidates. The reranker gives you precision — it sees query and chunk simultaneously.",
    color: "text-purple-400",
  },
  {
    id: "assemble",
    label: "Context assembly",
    detail: "Add source metadata, surrounding chunks, ordering",
    note: "A theorem without its proof is often less useful. Source and page number anchor the student to the right material.",
    color: "text-pink-400",
  },
  {
    id: "llm",
    label: "LLM injection",
    detail: "Retrieved context → Apollo prompt",
    note: "Apollo responds grounded in the student's own materials. Not a generic explanation — their professor's notation, their textbook.",
    color: "text-brand",
  },
];

export function RetrievalPipeline() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-4 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Retrieval pipeline — step through
      </p>

      {/* Step tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <button type="button"
            key={s.id}
            onClick={() => setActive(i)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-mono transition-all duration-150 ${
              i === active
                ? "border-white/30 bg-white/10 text-white"
                : i < active
                  ? "border-divide bg-white/5 text-white/40"
                  : "border-divide bg-neutral-900 text-white/30 hover:border-white/20 hover:text-white/60"
            }`}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-0.5 w-full rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-brand"
          animate={{ scaleX: (active + 1) / STEPS.length }}
          style={{ transformOrigin: "left" }}
          transition={{ duration: 0.25 }}
        />
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-white">
              {current.label}
            </span>
          </div>
          <div className="rounded-lg border border-divide bg-neutral-950/60 px-4 py-3 font-mono text-xs text-white/60">
            {current.detail}
          </div>
          <p className="text-sm text-white/55 leading-relaxed">{current.note}</p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between border-divide border-t pt-4">
        <button type="button"
          onClick={() => setActive((s) => Math.max(0, s - 1))}
          disabled={active === 0}
          className="text-xs text-white/40 transition-colors hover:text-white disabled:opacity-20"
        >
          ← prev
        </button>
        <span className="text-xs text-white/40 font-mono">
          {active + 1} / {STEPS.length}
        </span>
        <button type="button"
          onClick={() => setActive((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={active === STEPS.length - 1}
          className="text-xs text-white/40 transition-colors hover:text-white disabled:opacity-20"
        >
          next →
        </button>
      </div>
    </div>
  );
}
