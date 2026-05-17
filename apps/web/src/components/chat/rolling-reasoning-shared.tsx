"use client";

import { useCallback, useState } from "react";

export const ROW_HEIGHT = 22;
export const VISIBLE_ROWS = 3;
export const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
export const AUTO_CLOSE_DELAY = 1000;
export const MS_IN_S = 1000;

export function buildOccurrenceKey(
  baseKey: string,
  seenKeys: Map<string, number>
) {
  const occurrence = seenKeys.get(baseKey) ?? 0;
  seenKeys.set(baseKey, occurrence + 1);
  return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[3px] rounded-full bg-current [animation:avenire-dot-pulse_1.5s_ease-in-out_infinite]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

export function ThinkingDots() {
  return (
    <span
      aria-hidden="true"
      className="ml-1 inline-flex -translate-y-px items-center gap-[3px]"
    >
      <Dot delay={0} />
      <Dot delay={0.25} />
      <Dot delay={0.5} />
    </span>
  );
}

interface ControllableStateOptions<T> {
  defaultProp: T;
  onChange?: (value: T) => void;
  prop?: T;
}

export const useControllableState = <T,>({
  prop,
  defaultProp,
  onChange,
}: ControllableStateOptions<T>) => {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultProp);

  const isControlled = prop !== undefined;
  const value = isControlled ? (prop as T) : uncontrolled;

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const nextValue =
        typeof next === "function" ? (next as (previous: T) => T)(value) : next;

      if (!isControlled) {
        setUncontrolled(nextValue);
      }

      if (nextValue !== value) {
        onChange?.(nextValue);
      }
    },
    [isControlled, onChange, value]
  );

  return [value, setValue] as const;
};
