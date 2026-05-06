"use client";

import { Badge } from "@avenire/ui/components/badge";
import {
  AnimatePresence,
  m,
  useInView,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    id: "drive",
    title: "A Drive that actually remembers",
    description:
      "Upload PDFs, notes, and videos — Avenire reads, indexes, and interconnects your content. Ask questions across all sources, trace where you learned something, and discover hidden connections.",
    heading: "A Drive that actually remembers",
    icon: (
      <svg
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width="18"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "compound",
    title: "Compound interest for your brain",
    description:
      "Every concept connects to what you already know. Avenire builds a knowledge graph that compounds over time — revisiting a topic brings back all linked context, reasoning chains, and insights.",
    heading: "Compound interest for your brain",
    icon: (
      <svg
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width="18"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "interactive",
    title: "Interactivity",
    description:
      'Click into any reasoning step to explore "why." Branch into tangents. Every interaction deepens your understanding graph and adapts to how you learn.',
    heading: "Interactivity",
    icon: (
      <svg
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width="18"
      >
        <rect height="14" rx="2" width="20" x="2" y="3" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    ),
  },
];

/* ── Compound Visual: Animated learning timeline ── */
const timelineSteps = [
  { label: "Entropy", sub: "Core concept", time: "Day 1" },
  { label: "Thermodynamics", sub: "Connected", time: "Day 3" },
  { label: "Statistical Mech", sub: "Linked insight", time: "Day 5" },
  { label: "Arrow of Time", sub: "Emerged from graph", time: "Day 8" },
];

function CompoundVisual() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep((s) => (s + 1) % timelineSteps.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <m.div
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex items-center justify-center p-8"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex w-full max-w-[280px] flex-col gap-0">
        {timelineSteps.map((step, i) => {
          const isActive = i <= activeStep;
          const isCurrent = i === activeStep;
          return (
            <div className="flex gap-3" key={step.label}>
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <m.div
                  animate={{
                    borderColor: isActive ? "var(--primary)" : "var(--border)",
                    backgroundColor: isCurrent
                      ? "var(--primary)"
                      : "transparent",
                    boxShadow: isCurrent ? "0 0 10px var(--primary)" : "none",
                    scale: isCurrent ? 1.2 : 1,
                  }}
                  className="z-10 h-2.5 w-2.5 shrink-0 rounded-full border-2"
                  transition={{ duration: 0.4 }}
                />
                {i < timelineSteps.length - 1 && (
                  <m.div
                    animate={{
                      backgroundColor: isActive
                        ? "var(--primary)"
                        : "var(--border)",
                      opacity: isActive ? 0.5 : 0.2,
                    }}
                    className="min-h-[32px] w-[1.5px] flex-1"
                    transition={{ duration: 0.4 }}
                  />
                )}
              </div>
              {/* Content */}
              <m.div
                animate={{ opacity: isActive ? 1 : 0.3 }}
                className="-mt-0.5 pb-5"
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium text-[12px] ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <m.span
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] text-primary"
                      initial={{ opacity: 0, scale: 0.8 }}
                    >
                      NEW
                    </m.span>
                  )}
                </div>
                <p className="mt-0.5 text-[9px] text-muted-foreground/50">
                  {step.sub} · <span className="font-mono">{step.time}</span>
                </p>
                {/* Connection lines for current */}
                {isCurrent && i > 0 && (
                  <m.div
                    animate={{ opacity: 1, width: "100%" }}
                    className="mt-2 flex items-center gap-1.5"
                    initial={{ opacity: 0, width: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <div className="h-[1px] flex-1 bg-primary/20" />
                    <span className="whitespace-nowrap font-mono text-[8px] text-primary/50">
                      linked to {timelineSteps[i - 1].label}
                    </span>
                    <div className="h-[1px] w-4 bg-primary/20" />
                  </m.div>
                )}
              </m.div>
            </div>
          );
        })}

        {/* Counter */}
        <m.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          className="mt-1 flex items-center gap-2 pl-[22px]"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <div className="h-1 w-1 rounded-full bg-primary/50" />
          <span className="font-mono text-[8px] text-muted-foreground/40">
            {activeStep + 1} of {timelineSteps.length} concepts compounding
          </span>
        </m.div>
      </div>
    </m.div>
  );
}

/* ── Drive Visual: Multi-step file indexing ── */
const driveFiles = [
  { name: "lecture-7.pdf", type: "PDF", size: "2.4 MB" },
  { name: "research-notes.md", type: "MD", size: "14 KB" },
  { name: "quantum-vid.mp4", type: "VID", size: "340 MB" },
];

const extractedContent = [
  {
    heading: "Self-Attention Mechanism",
    text: "Each position attends to all positions in the previous layer...",
  },
  {
    heading: "Key Concepts Extracted",
    text: "Query (Q), Key (K), Value (V) vectors — scaled dot-product",
  },
  {
    heading: "3 Flashcards Generated",
    text: "Q: How is attention computed? → softmax(QKᵀ/√dₖ)V",
  },
];

function DriveVisual() {
  const [phase, setPhase] = useState<"scanning" | "indexed" | "expanded">(
    "scanning"
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (phase === "scanning") {
      timer = setTimeout(() => setPhase("indexed"), 3000);
    } else if (phase === "indexed") {
      timer = setTimeout(() => setPhase("expanded"), 1500);
    } else {
      // Hold expanded state, then restart cycle.
      timer = setTimeout(() => setPhase("scanning"), 5500);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [phase]);

  const isExpanded = phase === "expanded";

  return (
    <m.div
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex items-center justify-center p-8"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex w-full max-w-[290px] flex-col gap-2">
        {driveFiles.map((file, i) => {
          const isMiddle = i === 1;
          const shouldHide = isExpanded && !isMiddle;
          const shouldExpand = isExpanded && isMiddle;

          return (
            <m.div
              animate={{
                opacity: shouldHide ? 0 : 1,
                x: 0,
                height: shouldHide ? 0 : "auto",
                marginBottom: shouldHide ? 0 : undefined,
              }}
              className="overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              key={file.name}
              transition={{ duration: 0.5, delay: shouldHide ? 0 : i * 0.12 }}
            >
              <div
                className={`flex items-center gap-3 rounded-lg border bg-card/80 px-3.5 py-2.5 transition-all duration-500 ${
                  shouldExpand
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-border/60"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
                  <span className="font-mono font-semibold text-[8px] text-primary tracking-wider">
                    {file.type}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[11px] text-foreground">
                    {file.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60">
                    {file.size}
                  </p>
                </div>
                {/* Status indicator */}
                <AnimatePresence mode="wait">
                  {phase === "scanning" ? (
                    <m.div
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      className="h-1.5 w-1.5 rounded-full bg-primary/80"
                      key="scan"
                      transition={{
                        duration: 1.5,
                        delay: i * 0.4,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                  ) : (
                    <m.div
                      animate={{ scale: 1 }}
                      className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success/20"
                      initial={{ scale: 0 }}
                      key="done"
                    >
                      <svg
                        fill="none"
                        height="8"
                        stroke="var(--success)"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        width="8"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Expanded content for middle file */}
              <AnimatePresence>
                {shouldExpand && (
                  <m.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <div className="mt-2 space-y-2 pl-[44px]">
                      {extractedContent.map((item, j) => (
                        <m.div
                          animate={{ opacity: 1, y: 0 }}
                          className="border-primary/20 border-l-2 py-1 pl-3"
                          initial={{ opacity: 0, y: 8 }}
                          key={item.heading}
                          transition={{ delay: 0.4 + j * 0.15 }}
                        >
                          <p className="font-medium text-[10px] text-foreground/80">
                            {item.heading}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted-foreground/50 leading-relaxed">
                            {item.text}
                          </p>
                        </m.div>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          );
        })}

        {/* Progress / status bar */}
        <m.div
          animate={{ opacity: 1 }}
          className="mt-1"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {phase === "scanning" ? (
              <m.div exit={{ opacity: 0 }} key="progress">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest">
                    Indexing
                  </span>
                  <span className="font-mono text-[9px] text-primary">3/3</span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-border/40">
                  <m.div
                    animate={{ width: "100%" }}
                    className="h-full rounded-full bg-primary/70"
                    initial={{ width: "0%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                  />
                </div>
              </m.div>
            ) : (
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 4 }}
                key="complete"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_var(--success)]" />
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                  {isExpanded
                    ? "3 concepts extracted · 3 flashcards ready"
                    : "All files indexed"}
                </span>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </div>
    </m.div>
  );
}

function FlashcardsVisual() {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setFlipped((f) => !f), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <m.div
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center p-8"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      style={{ perspective: "800px" }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative w-full max-w-[260px]">
        <m.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          className="relative aspect-[4/3] w-full cursor-pointer"
          onClick={() => setFlipped(!flipped)}
          style={{ transformStyle: "preserve-3d" }}
          transition={{
            duration: 0.7,
            type: "spring",
            stiffness: 100,
            damping: 15,
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Badge className="mb-4 text-[8px]" variant="outline">
              Question
            </Badge>
            <p className="font-medium font-serif text-foreground text-sm leading-relaxed">
              What explains the Arrow of Time?
            </p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-card p-6 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <Badge className="mb-4 text-[8px]" variant="secondary">
              Answer
            </Badge>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              The statistical tendency of macroscopic systems to evolve toward
              states of higher entropy.
            </p>
          </div>
        </m.div>

        {/* Spaced repetition buttons */}
        <div className="flex h-14 items-end justify-center">
          <AnimatePresence>
            {flipped && (
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                {[
                  {
                    label: "Again",
                    time: "<1m",
                    hover: "hover:border-red-500/30 hover:text-red-400",
                  },
                  {
                    label: "Hard",
                    time: "2d",
                    hover: "hover:border-orange-500/30 hover:text-orange-400",
                  },
                  {
                    label: "Good",
                    time: "4d",
                    hover: "hover:border-green-500/30 hover:text-green-400",
                  },
                  {
                    label: "Easy",
                    time: "7d",
                    hover: "hover:border-blue-500/30 hover:text-blue-400",
                  },
                ].map((btn) => (
                  <m.button
                    className={`flex flex-col items-center rounded-lg border border-border bg-card px-3 py-1.5 text-muted-foreground transition-all duration-200 ${btn.hover}`}
                    key={btn.label}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="mb-0.5 font-medium font-mono text-[10px] leading-none">
                      {btn.time}
                    </span>
                    <span className="text-[8px] leading-none opacity-50">
                      {btn.label}
                    </span>
                  </m.button>
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </m.div>
  );
}

function Visualizer({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-lg md:aspect-[4/3]">
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--primary)/0.06,transparent_65%)]" />

      <AnimatePresence mode="wait">
        {activeIndex === 0 && <DriveVisual key="drive" />}
        {activeIndex === 1 && <CompoundVisual key="compound" />}
        {activeIndex === 2 && <FlashcardsVisual key="flashcards" />}
      </AnimatePresence>
    </div>
  );
}

function MobileFeatureVisual({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative h-[17rem] w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          backgroundSize: "128px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,var(--primary)/0.07,transparent_68%)]" />
      <div className="absolute inset-0 scale-[0.88] sm:scale-95">
        <AnimatePresence mode="wait">
          {activeIndex === 0 && <DriveVisual key="drive-mobile" />}
          {activeIndex === 1 && <CompoundVisual key="compound-mobile" />}
          {activeIndex === 2 && <FlashcardsVisual key="flashcards-mobile" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Main Section ── */
export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sequenceRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!Number.isFinite(value)) {
      return;
    }
    const nextIndex = Math.min(
      features.length - 1,
      Math.floor(value * features.length)
    );
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
  });

  return (
    <section className="py-24 md:py-28" id="how-it-works" ref={sectionRef}>
      <div className="mx-auto max-w-7xl px-4">
        <m.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-10 md:hidden"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5 }}
        >
          <span className="font-medium font-mono text-primary text-xs tracking-wider">
            {"{ How it works }"}
          </span>
          <h2 className="mt-3 mb-2 font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
            How it works
          </h2>
        </m.div>

        <div
          className="hidden md:block"
          ref={sequenceRef}
          style={{ height: `${features.length * 90}vh` }}
        >
          <div className="sticky top-20 h-[calc(100vh-5rem)]">
            <div className="relative flex h-full flex-col">
              <m.div
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                className="mb-3 shrink-0"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.5 }}
              >
                <span className="font-medium font-mono text-primary text-xs tracking-wider">
                  {"{ How it works }"}
                </span>
                <h2 className="mt-3 mb-2 font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
                  How Avenire works
                </h2>
              </m.div>

              <m.div
                animate={{ opacity: [0.45, 1, 0.45] }}
                aria-hidden="true"
                className="pointer-events-none absolute right-4 bottom-4 z-10 hidden items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-2 shadow-sm backdrop-blur-sm md:flex"
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.24em]">
                  Scroll
                </span>
                <m.svg
                  animate={{ y: [0, 4, 0] }}
                  className="text-muted-foreground/70"
                  fill="none"
                  height="12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  viewBox="0 0 24 24"
                  width="12"
                >
                  <path d="M12 5v14" />
                  <path d="m6 13 6 6 6-6" />
                </m.svg>
              </m.div>

              <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.05fr] items-center gap-14">
                <div className="relative pr-4">
                  <div className="space-y-3">
                    {features.map((feature, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <m.article
                          animate={{
                            opacity: isActive ? 1 : 0.45,
                            x: isActive ? 0 : -8,
                            scale: isActive ? 1 : 0.985,
                          }}
                          className={`relative rounded-xl border px-6 py-6 pl-9 transition-colors duration-300 ${
                            isActive
                              ? "border-primary/25 bg-primary/[0.05]"
                              : "border-border/80 bg-card/45"
                          }`}
                          key={feature.id}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          <div
                            className={`absolute top-7 right-[2rem] h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                              isActive
                                ? "border-primary bg-primary shadow-[0_0_8px_var(--primary)]"
                                : "border-border bg-background"
                            }`}
                          />
                          <div className="flex items-center gap-3">
                            <div
                              className={`transition-all duration-300 ${isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-45"}`}
                            >
                              {feature.icon}
                            </div>
                            <p className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">
                              Step {(index + 1).toString().padStart(2, "0")}
                            </p>
                          </div>
                          <h3
                            className={`mt-2 font-medium text-base transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {feature.heading}
                          </h3>
                          <p
                            className={`mt-2 text-sm leading-relaxed transition-colors duration-300 ${isActive ? "text-muted-foreground" : "text-muted-foreground/75"}`}
                          >
                            {feature.description}
                          </p>
                        </m.article>
                      );
                    })}
                  </div>
                </div>

                <m.div
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  className="relative"
                  initial={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                >
                  <Visualizer activeIndex={activeIndex} />
                </m.div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-7 md:hidden">
          {features.map((feature, index) => (
            <m.article
              className="rounded-xl border border-border/80 bg-card/55 p-5"
              initial={{ opacity: 0, y: 22 }}
              key={feature.id}
              transition={{ duration: 0.45, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.3 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className="text-primary">{feature.icon}</div>
                <p className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
                  Step {(index + 1).toString().padStart(2, "0")}
                </p>
              </div>
              <h3 className="mt-3 font-semibold text-foreground text-xl">
                {feature.heading}
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-5">
                <MobileFeatureVisual activeIndex={index} />
              </div>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
}
