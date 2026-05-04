"use client";

import { Badge } from "@avenire/ui/components/badge";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ── Jargon / Simple pairs for the text eraser ── */
const textPairs = [
  {
    jargon:
      "The utilization of thermodynamic principles combined with statistical mechanical approaches yields an optimal framework for elucidating macroscopic entropy variations.",
    simple:
      "Heat and probability explain why things naturally become disordered over time.",
  },
  {
    jargon:
      "Quantum mechanical superposition of eigenstates enables non-deterministic wave function evolution prior to decoherence-induced collapse.",
    simple:
      "Particles exist in multiple states at once — until you look at them.",
  },
  {
    jargon:
      "Neuroplasticity-dependent synaptic potentiation facilitates engram consolidation during slow-wave oscillatory epochs.",
    simple: "Your brain strengthens memories while you sleep.",
  },
];

function TextEraser() {
  const [isSimplified, setIsSimplified] = useState(false);
  const [pairIndex, setPairIndex] = useState(0);

  const handleSimplify = () => {
    if (isSimplified) {
      return;
    }
    setIsSimplified(true);
  };

  // Auto-reset after showing simplified text for a few seconds
  useEffect(() => {
    if (!isSimplified) {
      return;
    }
    const t = setTimeout(() => {
      setIsSimplified(false);
      setPairIndex((p) => (p + 1) % textPairs.length);
    }, 6000);
    return () => clearTimeout(t);
  }, [isSimplified]);

  const pair = textPairs[pairIndex];

  return (
    <div className="relative flex aspect-square w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg md:aspect-[4/3]">
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          backgroundSize: "128px",
        }}
      />
      {/* Radial accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,var(--primary)/0.05,transparent_60%)]" />
      {/* Content area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 md:px-12">
        {/* Jargon text */}
        <div className="pointer-events-none absolute inset-x-8 flex items-center justify-center md:inset-x-12">
          <motion.p
            animate={{
              opacity: isSimplified ? 0 : 0.7,
              filter: isSimplified ? "blur(6px)" : "blur(0px)",
            }}
            className="text-center font-mono text-muted-foreground text-sm leading-relaxed md:text-base"
            transition={{ duration: 0.8, delay: isSimplified ? 0 : 0.6 }}
          >
            &ldquo;{pair.jargon}&rdquo;
          </motion.p>
        </div>

        {/* Simplified text */}
        <div className="pointer-events-none absolute inset-x-8 flex items-center justify-center md:inset-x-12">
          <motion.p
            animate={{
              opacity: isSimplified ? 1 : 0,
              filter: isSimplified ? "blur(0px)" : "blur(6px)",
            }}
            className="text-center font-semibold font-serif text-foreground text-xl leading-snug md:text-2xl lg:text-3xl"
            transition={{ duration: 0.8, delay: isSimplified ? 0.6 : 0 }}
          >
            &ldquo;{pair.simple}&rdquo;
          </motion.p>
        </div>
      </div>

      {/* Bottom bar with Simplify button */}
      <div className="relative z-10 flex items-center justify-between border-border/60 border-t px-5 py-3">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{
              backgroundColor: isSimplified
                ? "oklch(0.72 0.17 142)"
                : "var(--primary)",
              boxShadow: isSimplified
                ? "0 0 8px oklch(0.72 0.17 142 / 0.5)"
                : "0 0 8px var(--primary)",
            }}
            className="h-1.5 w-1.5 rounded-full"
            transition={{ duration: 0.3 }}
          />
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            {isSimplified ? "First principles applied" : "Jargon detected"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-muted-foreground">
            {pairIndex + 1}/{textPairs.length}
          </span>
          <motion.button
            className={`rounded-lg border px-4 py-1.5 font-medium text-[11px] transition-all duration-200 ${
              isSimplified
                ? "cursor-default border-border/40 text-muted-foreground/30"
                : "cursor-pointer border-primary/40 bg-primary text-primary hover:bg-primary/15 hover:shadow-[0_0_12px_var(--primary)]"
            }`}
            disabled={isSimplified}
            onClick={handleSimplify}
            whileHover={isSimplified ? {} : { scale: 1.04 }}
            whileTap={isSimplified ? {} : { scale: 0.96 }}
          >
            {isSimplified ? "Simplifying..." : "✦ Simplify"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Section ── */
export function MeetApollo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28" id="meet-apollo" ref={ref}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          {/* Left: Text Eraser Visual */}
          <motion.div
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="order-2 lg:order-1"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            <TextEraser />
          </motion.div>

          {/* Right: Text Content */}
          <motion.div
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            className="order-1 lg:order-2"
            initial={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <span className="font-medium font-mono text-primary text-xs tracking-wider">
              {"{ Your AI Tutor }"}
            </span>
            <h2 className="mt-3 mb-2 font-semibold text-3xl text-foreground tracking-tight md:text-5xl">
              Meet Apollo
            </h2>
            <p className="mb-6 font-serif text-muted-foreground text-xl italic md:text-2xl">
              The Ghost of Richard Feynman
            </p>
            <p className="mb-8 max-w-lg text-muted-foreground text-sm leading-relaxed md:text-base">
              Apollo doesn&apos;t hand you answers — it teaches. Inspired by
              Feynman&apos;s philosophy, it breaks complex ideas into first
              principles, identifies gaps in your understanding, and translates
              dense jargon into clear, intuitive concepts.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Step-by-step reasoning",
                "Gap detection",
                "First principles",
                "Adaptive depth",
              ].map((tag) => (
                <Badge
                  className="h-auto cursor-default px-3 py-1 font-normal text-[10px] transition-colors hover:border-primary/30 hover:bg-primary/5"
                  key={tag}
                  variant="outline"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
