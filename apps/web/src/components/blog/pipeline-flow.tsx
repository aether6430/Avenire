"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  { id: "capture", label: "Capture", description: "You read a PDF, watch a lecture, or save a web page. Content lands in your workspace." },
  { id: "understand", label: "Understand", description: "Apollo helps you work through the material — explaining concepts, answering questions, breaking ideas into first principles." },
  { id: "retain", label: "Retain", description: "Key concepts become flashcards. FSRS schedules review at the optimal moment — just before you'd forget." },
  { id: "connect", label: "Connect", description: "Related ideas across different sources are linked. A concept from today's lecture connects to a note from last month." },
  { id: "retrieve", label: "Retrieve", description: "Search across everything — PDFs, notes, chat transcripts — with one query. Semantic, lexical, and trigram layers run in parallel." },
];

const GAPS = [
  { after: "capture", label: "✗ isolated", description: "In a fragmented workflow, the PDF reader doesn't talk to the notes app. What you captured stays trapped in its original tool." },
  { after: "understand", label: "✗ no bridge", description: "ChatGPT's explanation lives in a separate window. There's no automatic path from 'I understood this' to 'I should review this later.'" },
  { after: "retain", label: "✗ context lost", description: "The flashcard shows the question but not the surrounding discussion. The review surface is stripped of the original context." },
  { after: "connect", label: "✗ manual", description: "Connecting ideas requires you to remember both sources exist and manually link them. Most connections are never made." },
];

export function PipelineFlow() {
  const [active, setActive] = useState<string | null>(null);
  const activeStep = STEPS.find((s) => s.id === active);
  const activeGap = GAPS.find((g) => g.label === active);
  const activeInfo = activeStep?.description ?? activeGap?.description ?? null;

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6 font-mono text-sm">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-white/45">
        Study Tool Chain — click to inspect
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        An effective learning workflow has connected stages. The gaps between them
        are where knowledge gets lost. Click any node or gap to see the detail.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => {
          const gapHere = GAPS.find((g) => g.after === step.id);
          return (
            <div key={step.id} className="flex items-center gap-2">
              {/* Step node */}
              <button type="button"
                onClick={() => setActive(active === step.id ? null : step.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-all duration-150 ${
                  active === step.id
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-divide bg-neutral-950/40 text-white/50 hover:border-white/30 hover:text-white/80"
                }`}
              >
                {step.label}
              </button>

              {/* Arrow */}
              {i < STEPS.length - 1 && (
                <span className="text-white/20 text-xs">→</span>
              )}

              {/* Gap badge */}
              {gapHere && (
                <button type="button"
                  onClick={() =>
                    setActive(active === gapHere.label ? null : gapHere.label)
                  }
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition-all duration-150 ${
                    active === gapHere.label
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                      : "border-white/10 text-white/30 hover:border-amber-400/30 hover:text-amber-400"
                  }`}
                >
                  {gapHere.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeInfo && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-4 rounded-lg border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white/55 leading-relaxed"
          >
            {activeStep && <span className="font-semibold text-white">{activeStep.label}: </span>}
            {activeGap && <span className="font-semibold text-amber-400">{activeGap.label}: </span>}
            {activeInfo}
          </motion.div>
        )}
      </AnimatePresence>

      {!active && (
        <p className="mt-4 text-xs text-white/30 text-center">
          Click a stage or a gap (✗) to see the detail
        </p>
      )}
    </div>
  );
}
