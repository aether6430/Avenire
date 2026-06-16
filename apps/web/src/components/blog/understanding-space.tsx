"use client";
import { useState } from "react";

const DENSE = [
  { x: 140, y: 90, label: "entropy", connected: [1, 2, 3, 4] },
  { x: 220, y: 55, label: "microstates", connected: [0, 2] },
  { x: 260, y: 130, label: "probability", connected: [0, 1, 4] },
  { x: 80, y: 140, label: "heat", connected: [0, 4] },
  { x: 190, y: 165, label: "2nd law", connected: [0, 2, 3] },
];

const SPARSE = [
  { x: 140, y: 90, label: "entropy", connected: [] },
  { x: 220, y: 55, label: "microstates", connected: [] },
  { x: 260, y: 130, label: "probability", connected: [] },
  { x: 80, y: 140, label: "heat", connected: [] },
  { x: 190, y: 165, label: "2nd law", connected: [] },
];

export function UnderstandingSpaceDemo() {
  const [mode, setMode] = useState<"dense" | "sparse">("dense");
  const nodes = mode === "dense" ? DENSE : SPARSE;

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        Understanding as a knowledge graph
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        When you truly understand a topic, related concepts cluster together with
        strong connections. When you've only memorised facts, nodes exist in
        isolation. Toggle between a student who <em>understands</em> thermodynamics
        and one who has <em>crammed</em> it.
      </p>

      <div className="mb-4 flex gap-2">
        {(["dense", "sparse"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-mono transition-all duration-150 ${
              mode === m
                ? "border-brand bg-brand/10 text-brand"
                : "border-divide bg-neutral-900/55 text-white/55 hover:border-white/30 hover:text-white/80"
            }`}
          >
            {m === "dense" ? "understands" : "memorised"}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 340 220" className="w-full rounded-lg border border-divide bg-neutral-950 p-2">
        {/* Background */}
        <rect x="0" y="0" width="340" height="220" className="fill-neutral-950" />

        {/* Edges */}
        {nodes.flatMap((node, i) =>
          node.connected.filter((j) => j > i).map((j) => (
            <line
              key={`${i}-${j}`}
              x1={node.x}
              y1={node.y}
              x2={nodes[j].x}
              y2={nodes[j].y}
              stroke="#abc4ff"
              strokeWidth="1.2"
              opacity="0.5"
            />
          ))
        )}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.connected.length > 2 ? 22 : 16}
              className={
                mode === "dense"
                  ? "fill-brand/20 stroke-brand"
                  : "fill-neutral-900 stroke-white/20"
              }
              strokeWidth={mode === "dense" ? "1.2" : "1"}
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              className={mode === "dense" ? "fill-brand" : "fill-white/40"}
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              {node.label}
            </text>
          </g>
        ))}

        <text
          x="170"
          y="210"
          textAnchor="middle"
          className="fill-white/40"
          fontSize="8"
          fontFamily="ui-monospace, monospace"
        >
          {mode === "dense"
            ? "dense neighbourhood → can navigate novel problems"
            : "isolated nodes → can recall, cannot apply"}
        </text>
      </svg>
    </div>
  );
}
