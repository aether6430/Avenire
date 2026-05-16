"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PetAnimationName } from "@/lib/pet-preferences";
import { PET_ATLAS } from "./pet-atlas";

interface SpritePetProps {
  animation: PetAnimationName;
  onAnimationComplete?: (animation: PetAnimationName) => void;
  scale?: number;
  src: string;
}

export function SpritePet({
  animation,
  src,
  scale = 0.48,
  onAnimationComplete,
}: SpritePetProps) {
  const [frame, setFrame] = useState(0);
  const completedRef = useRef(false);
  const definition = PET_ATLAS.animations[animation];
  const isOneShot = animation !== "idle" && animation !== "waiting";

  useEffect(() => {
    completedRef.current = false;
    setFrame(0);
  }, []);

  useEffect(() => {
    if (!definition || completedRef.current) {
      return;
    }

    const duration =
      definition.frameDurations[frame] ??
      definition.frameDurations.at(-1) ??
      150;

    const timeout = window.setTimeout(() => {
      const nextFrame = frame + 1;
      if (nextFrame >= definition.frames) {
        if (isOneShot) {
          completedRef.current = true;
          setFrame(Math.max(0, definition.frames - 1));
          onAnimationComplete?.(animation);
          return;
        }
        setFrame(0);
        return;
      }
      setFrame(nextFrame);
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [animation, definition, frame, isOneShot, onAnimationComplete]);

  const size = useMemo(
    () => ({
      width: PET_ATLAS.cellWidth * scale,
      height: PET_ATLAS.cellHeight * scale,
      backgroundWidth: PET_ATLAS.columns * PET_ATLAS.cellWidth * scale,
      backgroundHeight: PET_ATLAS.rows * PET_ATLAS.cellHeight * scale,
    }),
    [scale]
  );

  return (
    <div
      aria-hidden
      className="shrink-0"
      style={{
        width: size.width,
        height: size.height,
        backgroundImage: `url("${src}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${size.backgroundWidth}px ${size.backgroundHeight}px`,
        backgroundPosition: `${-frame * size.width}px ${-definition.row * size.height}px`,
        imageRendering: "auto",
      }}
    />
  );
}
