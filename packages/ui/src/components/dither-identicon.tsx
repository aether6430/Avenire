"use client";

import type { CSSProperties } from "react";

const BAYER_4: readonly number[] = [
  0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5,
];

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value |= 0;
    value = (value + 0x6d_2b_79_f5) | 0;

    let next = Math.imul(value ^ (value >>> 15), value | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const IDENTICON_PALETTE = [
  "#abc4ff",
  "#bde0fe",
  "#cdb4db",
  "#ffc8dd",
  "#ffafcc",
  "#a8dadc",
  "#ffd166",
  "#95d5b2",
] as const;

function resolveIdenticonColor(hash: number): string {
  return IDENTICON_PALETTE[hash % IDENTICON_PALETTE.length] ?? "#abc4ff";
}

interface DitherIdenticonProps {
  backgroundColor?: string;
  className?: string;
  color?: string;
  seed: string;
  size?: number;
  style?: CSSProperties;
}

export function DitherIdenticon({
  backgroundColor = "transparent",
  className,
  color,
  seed,
  size = 32,
  style,
}: DitherIdenticonProps) {
  const hash = hashSeed(seed);
  const random = mulberry32(hash);
  const foregroundColor = color ?? resolveIdenticonColor(hash);
  const angle = random() * Math.PI * 2;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const center = (size - 1) / 2;
  const denominator = size / 2;

  const cells: { fill: string; key: string; x: number; y: number }[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const normalizedX = (x - center) / denominator;
      const normalizedY = (y - center) / denominator;
      const outside = normalizedX * normalizedX + normalizedY * normalizedY > 1;

      if (outside) {
        cells.push({
          fill: backgroundColor,
          key: `${x}-${y}`,
          x,
          y,
        });
        continue;
      }

      let intensity = 0.5 + 0.5 * (normalizedX * cosine + normalizedY * sine);
      intensity -= (random() - 0.5) * 0.08;

      if (intensity < 0) {
        intensity = 0;
      }

      if (intensity > 1) {
        intensity = 1;
      }

      const bayer = (BAYER_4[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
      const on = intensity >= bayer;

      cells.push({
        fill: on ? foregroundColor : backgroundColor,
        key: `${x}-${y}`,
        x,
        y,
      });
    }
  }

  return (
    <svg
      className={className}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      style={style}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {cells.map(({ fill, key, x, y }) => (
        <rect fill={fill} height={1} key={key} width={1} x={x} y={y} />
      ))}
    </svg>
  );
}
