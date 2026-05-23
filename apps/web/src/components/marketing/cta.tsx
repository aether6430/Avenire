import Link from "next/link";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";

export interface CTAOrbitProps {
  className?: string;
  numRings?: number;
  ringDurationsSec?: number[];
  showRings?: boolean;
  size?: number;
}

export const CTA = () => {
  return (
    <Container className="relative flex min-h-60 flex-col items-center justify-center overflow-hidden border-divide border-x px-4 py-4 md:min-h-120">
      <CTAOrbit className="mask-b-from-30% absolute inset-x-0 -top-120" />
      <SectionHeading className="relative z-10 text-center lg:text-6xl">
        Bring your notes, files, and ideas <br /> into one learning workspace
      </SectionHeading>
      <Button as={Link} className="relative z-20 mt-4" href="/waitlist">
        Join the waitlist
      </Button>
    </Container>
  );
};

export const CTAOrbit: React.FC<CTAOrbitProps> = ({
  size = 800,
  className,
  showRings = true,
  ringDurationsSec,
  numRings = 3,
}) => {
  const nodes = [
    "PDF",
    "Notes",
    "Search",
    "Graph",
    "Cards",
    "Review",
    "Files",
    "Widgets",
    "Gaps",
    "Recall",
    "MD",
    "Study",
  ];
  const total = nodes.length;

  // Compute ring weights (fewer inner, more outer): proportional 1..numRings
  const weights = Array.from({ length: numRings }, (_, i) => i + 1); // [1,2,...]
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const countsBase = weights.map((w) => Math.floor((total * w) / weightSum));
  let remainder = total - countsBase.reduce((a, b) => a + b, 0);
  // Distribute remainder from outermost inward to favor outer rings
  for (let i = numRings - 1; i >= 0 && remainder > 0; i--) {
    countsBase[i] += 1;
    remainder--;
  }
  const counts: number[] = countsBase; // inner→outer

  let cursor = 0;
  const rings: string[][] = counts.map((count) => {
    const slice = nodes.slice(cursor, cursor + count);
    cursor += count;
    return slice;
  });

  // Dynamic ring scales (inner→outer)
  const innerScale = 0.42;
  const outerScale = 0.94;
  const ringScaleFactors: number[] =
    numRings <= 1
      ? [(innerScale + outerScale) / 2]
      : Array.from(
          { length: numRings },
          (_, i) =>
            innerScale + ((outerScale - innerScale) * i) / (numRings - 1)
        );

  const renderRing = (ringIndex: number) => {
    const ringLogos = rings[ringIndex];
    const count = ringLogos.length;
    if (count === 0) {
      return null;
    }

    const diameter = Math.round(size * ringScaleFactors[ringIndex]);
    const radius = diameter / 2;
    const defaultBase = 18;
    const defaultStep = 8;
    const duration =
      ringDurationsSec?.[ringIndex] ?? defaultBase + defaultStep * ringIndex;
    const reverse = ringIndex % 2 === 1;

    return (
      <div
        className={cn(
          "absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full",
          reverse ? "animate-counter-orbit" : "animate-orbit"
        )}
        key={`ring-${ringIndex}`}
        style={{
          width: diameter,
          height: diameter,
          ["--duration" as any]: `${duration}s`,
        }}
      >
        <div className="relative h-full w-full">
          {ringLogos.map((label, idx) => {
            const angleDeg = (360 / count) * idx;
            const translate = radius;
            return (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                key={`ring-${ringIndex}-logo-${label}`}
                style={{
                  transform: `rotate(${angleDeg}deg) translateX(${translate}px)`,
                }}
              >
                <div style={{ transform: `rotate(${-angleDeg}deg)` }}>
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-md border border-brand/20 bg-neutral-950/90 font-mono text-[10px] text-brand/85 uppercase shadow-aceternity",
                      reverse ? "animate-orbit" : "animate-counter-orbit"
                    )}
                    style={{
                      ["--duration" as any]: `${duration}s`,
                    }}
                  >
                    {label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showRings && (
        <div className="pointer-events-none absolute inset-0 z-0">
          {Array.from({ length: numRings }, (_, idx) => numRings - 1 - idx).map(
            (i) => {
              const diameter = Math.round(size * ringScaleFactors[i]);
              return (
                <div
                  className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-inner",
                    i === 0 && "bg-brand/10",
                    i === 1 && "bg-white/[0.045]",
                    i === 2 && "bg-white/[0.025]",
                    i === 3 && "bg-white/[0.015]"
                  )}
                  key={`bg-ring-${i}`}
                  style={{
                    width: diameter,
                    height: diameter,
                  }}
                />
              );
            }
          )}
        </div>
      )}
      {Array.from({ length: numRings }, (_, idx) => numRings - 1 - idx).map(
        (ringIndex) => renderRing(ringIndex)
      )}
    </div>
  );
};
