"use client";

import { useSession } from "@avenire/auth/client";
import { Button } from "@avenire/ui/components/button";
import { m, useInView } from "framer-motion";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── Conway's Game of Life ── */
const CELL_SIZE = 12;
const APP_HREF = "/workspace";

function useGameOfLife(width: number, height: number) {
  const cols = Math.floor(width / CELL_SIZE);
  const rows = Math.floor(height / CELL_SIZE);

  const createGrid = useCallback(() => {
    const grid: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = Math.random() < 0.15;
      }
    }
    return grid;
  }, [rows, cols]);

  const step = useCallback(
    (grid: boolean[][]) => {
      const next: boolean[][] = [];
      for (let r = 0; r < rows; r++) {
        next[r] = [];
        for (let c = 0; c < cols; c++) {
          let neighbors = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) {
                continue;
              }
              const nr = (r + dr + rows) % rows;
              const nc = (c + dc + cols) % cols;
              if (grid[nr][nc]) {
                neighbors++;
              }
            }
          }
          if (grid[r][c]) {
            next[r][c] = neighbors === 2 || neighbors === 3;
          } else {
            next[r][c] = neighbors === 3;
          }
        }
      }
      return next;
    },
    [rows, cols]
  );

  return { createGrid, step, rows, cols };
}

function ConwayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<boolean[][] | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const [dims, setDims] = useState({ w: 800, h: 400 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { createGrid, step, rows, cols } = useGameOfLife(dims.w, dims.h);

  useEffect(() => {
    gridRef.current = createGrid();
  }, [createGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = dims.w;
    canvas.height = dims.h;

    const tick = (time: number) => {
      if (time - lastTickRef.current > 500) {
        lastTickRef.current = time;
        if (gridRef.current) {
          gridRef.current = step(gridRef.current);
        }
      }

      ctx.clearRect(0, 0, dims.w, dims.h);

      if (gridRef.current) {
        // Read border color from CSS and keep animation intentionally subdued.
        const style = getComputedStyle(canvas);
        ctx.fillStyle = style.getPropertyValue("--border").trim();
        ctx.globalAlpha = 0.55;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (gridRef.current[r][c]) {
              ctx.fillRect(
                c * CELL_SIZE + 1,
                r * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
              );
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dims, step, rows, cols]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-sidebar"
      ref={containerRef}
    >
      <canvas className="h-full w-full" ref={canvasRef} />
      <div className="absolute inset-0 bg-background/35" />
      <div className="absolute inset-0 shadow-[inset_0_0_72px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

/* ── CTA Section ── */
export function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <section className="px-4 py-24" ref={ref}>
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-xl border border-border bg-card">
        <ConwayCanvas />

        <div className="relative z-10 mx-auto max-w-2xl px-8 py-24 text-center">
          <m.div
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4 font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
              Start building real understanding
            </h2>

            <p className="mx-auto mb-8 max-w-md text-muted-foreground text-sm leading-relaxed">
              Join a community of thinkers building real understanding, one
              reasoning step at a time.
            </p>

            <Button
              nativeButton={false}
              render={
                <Link href={(isSignedIn ? APP_HREF : "/waitlist") as Route} />
              }
              size="lg"
            >
              {isSignedIn ? "Go to app" : "Join waitlist"}
            </Button>

            <p className="mt-4 text-muted-foreground/50 text-xs">
              Free to start · No credit card required
            </p>
          </m.div>
        </div>
      </div>
    </section>
  );
}
