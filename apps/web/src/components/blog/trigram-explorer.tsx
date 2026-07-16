"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

function getTrigrams(text: string): string[] {
  const padded = `  ${text}  `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return Array.from(trigrams);
}

export function TrigramExplorer({
  defaultText,
  description,
}: {
  defaultText: string;
  description: string;
}) {
  const [text, setText] = useState(defaultText);
  const trigrams = useMemo(() => getTrigrams(text), [text]);

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-3 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Trigram Explorer
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">{description}</p>

      <input
        className="w-full rounded-lg border border-divide bg-neutral-950/60 px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a formula or phrase…"
      />

      <div className="mt-4">
        <p className="mb-2 text-xs text-white/40 font-mono">
          {trigrams.length} trigram{trigrams.length !== 1 ? "s" : ""} generated:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {trigrams.map((tri, i) => (
            <motion.span
              key={tri}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.008, duration: 0.1 }}
              className="rounded-md border border-divide bg-neutral-900/80 px-2 py-0.5 font-mono text-xs text-white/60"
            >
              {tri === "   " ? "·" : tri}
            </motion.span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40 leading-relaxed">
        PostgreSQL intersects trigram posting lists at query time — rows sharing
        all query trigrams are candidates, then confirmed on the full text.
      </p>
    </div>
  );
}
