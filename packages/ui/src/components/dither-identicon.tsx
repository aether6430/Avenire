"use client"

import type { CSSProperties } from "react"

/** row-major 4x4 Bayer 0..15 */
const BAYER_4: readonly number[] = [
  0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5,
]

function hashSeed(seed: string): number {
  let h = 2166136261

  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0

  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0

    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type DitherIdenticonProps = {
  seed: string
  color: string
  backgroundColor?: string
  /** Logical grid size (SVG viewBox is size x size, then scaled). */
  size?: number
  className?: string
  style?: CSSProperties
}

export function DitherIdenticon({
  seed,
  color,
  backgroundColor = "transparent",
  size = 32,
  className,
  style,
}: DitherIdenticonProps) {
  const rng = mulberry32(hashSeed(seed))
  const angle = rng() * Math.PI * 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const center = (size - 1) / 2
  const denom = size / 2

  const cells: { key: string; x: number; y: number; fill: string }[] = []

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - center) / denom
      const ny = (y - center) / denom

      const outside = nx * nx + ny * ny > 1

      if (outside) {
        cells.push({
          key: `${x}-${y}`,
          x,
          y,
          fill: backgroundColor,
        })
        continue
      }

      // 1 = solid foreground, 0 = background (gradient direction from seed).
      let intensity = 0.5 + 0.5 * (nx * cos + ny * sin)
      intensity -= (rng() - 0.5) * 0.08

      if (intensity < 0) {
        intensity = 0
      }

      if (intensity > 1) {
        intensity = 1
      }

      const bayer = (BAYER_4[(y % 4) * 4 + (x % 4)] + 0.5) / 16
      const on = intensity >= bayer

      cells.push({
        key: `${x}-${y}`,
        x,
        y,
        fill: on ? color : backgroundColor,
      })
    }
  }

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
    >
      {cells.map(({ key, x, y, fill }) => (
        <rect key={key} x={x} y={y} width={1} height={1} fill={fill} />
      ))}
    </svg>
  )
}
