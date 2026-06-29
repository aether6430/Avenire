import type { MisconceptionSignalResult } from "@avenire/ai/misconception-signals";

export interface CompletedMisconceptionSignalCheck {
  elapsedMs: number;
  signal: MisconceptionSignalResult | null;
}

export function schedulePostStartMisconceptionSignalCheck(input: {
  detect: () => Promise<MisconceptionSignalResult | null>;
  now?: () => number;
  onComplete: (result: CompletedMisconceptionSignalCheck) => void;
  schedule: (task: () => Promise<void>) => void;
}) {
  const now = input.now ?? performance.now.bind(performance);

  input.schedule(async () => {
    const startedAtMs = now();
    let signal: MisconceptionSignalResult | null = null;

    try {
      signal = await input.detect();
    } catch {
      signal = null;
    }

    input.onComplete({
      elapsedMs: Math.round((now() - startedAtMs) * 1000) / 1000,
      signal,
    });
  });
}
