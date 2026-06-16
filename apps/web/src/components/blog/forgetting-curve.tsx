"use client";
import { useEffect, useRef, useState } from "react";

function retentionAt(daysSince: number, stability: number): number {
  return Math.exp(-daysSince / stability);
}

export function ForgettingCurve() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stability, setStability] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { top: 16, right: 16, bottom: 32, left: 44 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const DAYS = 30;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + plotW, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (plotH * i) / 4;
      ctx.fillText(`${100 - i * 25}%`, PAD.left - 6, y + 4);
    }

    // X-axis labels
    ctx.textAlign = "center";
    for (const d of [0, 7, 14, 21, 30]) {
      const x = PAD.left + (d / DAYS) * plotW;
      ctx.fillText(`${d}d`, x, H - 6);
    }

    // Draw curve: passive (no reviews)
    ctx.strokeStyle = "rgba(217, 115, 13, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let px = 0; px <= plotW; px++) {
      const day = (px / plotW) * DAYS;
      const r = retentionAt(day, 1.5);
      const y = PAD.top + plotH * (1 - r);
      px === 0 ? ctx.moveTo(PAD.left + px, y) : ctx.lineTo(PAD.left + px, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw curve: with spaced reviews (active recall)
    const reviews = [1, 4, 12];
    let currentStab = stability;
    let lastReviewDay = 0;

    ctx.strokeStyle = "#abc4ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px <= plotW; px++) {
      const day = (px / plotW) * DAYS;
      for (const rd of reviews) {
        if (day >= rd && lastReviewDay < rd) {
          currentStab = currentStab * 1.8;
          lastReviewDay = rd;
        }
      }
      const daysSince = day - lastReviewDay;
      const r = retentionAt(daysSince, currentStab);
      const y = PAD.top + plotH * (1 - r);
      px === 0 ? ctx.moveTo(PAD.left + px, y) : ctx.lineTo(PAD.left + px, y);
    }
    ctx.stroke();

    // Review markers
    ctx.fillStyle = "#abc4ff";
    for (const rd of reviews) {
      const x = PAD.left + (rd / DAYS) * plotW;
      ctx.beginPath();
      ctx.arc(x, PAD.top + 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legend
    ctx.font = "9px ui-monospace, monospace";
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(217, 115, 13, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left, H - 14);
    ctx.lineTo(PAD.left + 16, H - 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("passive review", PAD.left + 20, H - 11);

    ctx.strokeStyle = "#abc4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD.left + 120, H - 14);
    ctx.lineTo(PAD.left + 136, H - 14);
    ctx.stroke();
    ctx.fillStyle = "#abc4ff";
    ctx.fillText("spaced repetition", PAD.left + 140, H - 11);
  }, [stability]);

  return (
    <div className="my-8 rounded-xl border border-divide bg-neutral-900/55 p-6">
      <p className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/45">
        The Forgetting Curve
      </p>
      <p className="mb-4 text-sm text-white/55 leading-relaxed">
        Memory retention over 30 days. The blue dots mark spaced review sessions
        — each review strengthens the memory, flattening the decay curve.
      </p>
      <canvas
        ref={canvasRef}
        width={560}
        height={200}
        className="w-full"
      />
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-white/55">Initial stability</span>
          <span className="font-mono text-white">{stability} days</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={stability}
          onChange={(e) => setStability(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <p className="mt-1 text-xs text-white/40 leading-relaxed">
          Stability = how long before retention drops below 50%. Drag to
          see how initial learning strength affects the curve.
        </p>
      </div>
    </div>
  );
}
