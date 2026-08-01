export const mapWithConcurrency = async <T, Result>(
  values: readonly T[],
  concurrency: number,
  map: (value: T, index: number) => Promise<Result>
): Promise<Result[]> => {
  if (values.length === 0) {
    return [];
  }

  const entries = values.entries();
  const results = new Map<number, Result>();
  const workers = Array.from(
    {
      length: Math.min(Math.max(1, Math.floor(concurrency)), values.length),
    },
    async () => {
      while (true) {
        const next = entries.next();
        if (next.done) {
          return;
        }

        const [index, value] = next.value;
        results.set(index, await map(value, index));
      }
    }
  );

  await Promise.all(workers);

  return [...results.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, result]) => result);
};

export const runWithConcurrency = async <T>(
  values: readonly T[],
  concurrency: number,
  run: (value: T, index: number) => Promise<void>
): Promise<void> => {
  await mapWithConcurrency(values, concurrency, run);
};
