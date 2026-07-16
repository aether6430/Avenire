"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BEFORE_CHUNKS = [
  { id: "c1", index: 0, text: "Gauss's law states that the total electric flux through a closed surface is proportional to the enclosed charge…", status: "unchanged" as const },
  { id: "c2", index: 1, text: "For a spherical surface of radius r around a point charge Q, the electric field is uniform…", status: "unchanged" as const },
  { id: "c3", index: 2, text: "Applying the integral: ∮ E · dA = Q_enc / ε₀", status: "unchanged" as const },
  { id: "c4", index: 3, text: "Therefore E = Q / (4πε₀r²) — the Coulomb result.", status: "unchanged" as const },
];

const AFTER_CHUNKS = [
  { id: "c1", index: 0, text: "Gauss's law states that the total electric flux through a closed surface is proportional to the enclosed charge…", status: "unchanged" as const },
  { id: "c2", index: 1, text: "For a spherical surface of radius r around a point charge Q, the electric field is uniform…", status: "unchanged" as const },
  { id: "c3new", index: 2, text: "Applying the integral: ∮ E · dA = Q_enc / ε₀  ← fixed sign error", status: "new" as const },
  { id: "c4", index: 3, text: "Therefore E = Q / (4πε₀r²) — the Coulomb result.", status: "unchanged" as const },
];

const STEPS = [
  {
    title: "Original note stored",
    description: "Your note on Gauss's law is split into 4 semantic chunks. Each chunk has a content hash. The system knows exactly what you wrote.",
    chunks: BEFORE_CHUNKS,
  },
  {
    title: "You edit chunk 3",
    description: "You caught a sign error in the integral. As you type, the note saves and the changed chunk is flagged as 'dirty' for re-processing.",
    chunks: BEFORE_CHUNKS.map((c) => ({
      ...c,
      status: (c.id === "c3" ? "dirty" : "unchanged") as "unchanged" | "dirty",
    })),
  },
  {
    title: "Hash comparison runs",
    description: "The incoming content hashes are compared against stored hashes. Chunks c1, c2, c4 match → no-op. Chunk c3 has a new hash → scheduled for re-embedding.",
    chunks: AFTER_CHUNKS,
  },
  {
    title: "1 re-embedding call",
    description: "Only the changed chunk re-embeds. 3 unchanged chunks are skipped entirely. The vector index updates in <100ms — your note is searchable with the correction instantly.",
    chunks: AFTER_CHUNKS,
  },
];

const statusStyles: Record<string, string> = {
  unchanged: "border-white/10 bg-neutral-950/40 text-white/50",
  dirty: "border-amber-400/30 bg-amber-400/8 text-amber-400",
  new: "border-brand/30 bg-brand/8 text-brand",
};

const statusLabel: Record<string, string> = {
  unchanged: "unchanged",
  dirty: "edited",
  new: "→ re-embed",
};

export function DiffVisualizer() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Note Revision Tracker
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        When you revise a note, the system doesn't re-process everything — it
        compares hashes and only re-embeds what changed. Step through the process.
      </p>

      {/* Step indicator */}
      <div className="mb-4 flex gap-2">
        {STEPS.map((s, i) => (
          <button type="button"
            key={s.title}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            onClick={() => setStep(i)}
            className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
              i === step ? "bg-brand" : "bg-white/10 hover:bg-white/20"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
        >
          <p className="mb-1 font-semibold text-white">{current.title}</p>
          <p className="mb-4 text-sm text-white/55 leading-relaxed">
            {current.description}
          </p>

          <div className="space-y-2">
            {current.chunks.map((chunk) => (
              <div
                key={chunk.id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-200 ${
                  statusStyles[chunk.status]
                }`}
              >
                <span className="mt-0.5 shrink-0 font-mono text-xs text-white/30">
                  [{chunk.index}]
                </span>
                <span className="flex-1 text-xs leading-relaxed">
                  {chunk.text}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    chunk.status === "unchanged"
                      ? "text-white/30 bg-white/5"
                      : chunk.status === "dirty"
                        ? "text-amber-400 bg-amber-400/10"
                        : "text-brand bg-brand/10"
                  }`}
                >
                  {statusLabel[chunk.status]}
                </span>
              </div>
            ))}
          </div>
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
          {step + 1} / {STEPS.length}
        </span>
        <button type="button"
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          className="text-xs text-white/40 transition-colors hover:text-white disabled:opacity-20"
        >
          next →
        </button>
      </div>
    </div>
  );
}
