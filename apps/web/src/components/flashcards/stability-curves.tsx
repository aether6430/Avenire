"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  RechartsPrimitive,
} from "@avenire/ui/components/chart";
import type { FlashcardCardSnapshot } from "@/lib/flashcards";

const DAY_MS = 24 * 60 * 60 * 1000;

function retentionForDay(stability: number, day: number) {
  if (stability <= 0) {
    return 0;
  }

  return (1 + day / (9 * stability)) ** -1 * 100;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function StabilityCurves({
  snapshots,
}: {
  snapshots: FlashcardCardSnapshot[];
}) {
  const states = snapshots
    .map((snapshot) => snapshot.reviewState)
    .filter((state): state is NonNullable<typeof state> =>
      Boolean(state?.stability && state.stability > 0)
    );
  const stabilities = states
    .map((state) => state.stability)
    .filter((value): value is number => typeof value === "number");

  if (states.length === 0) {
    return null;
  }

  const medianStability = median(stabilities);
  const maxStability = Math.max(1, ...stabilities);
  const horizonDays = Math.max(14, Math.min(120, Math.ceil(maxStability * 2)));
  const dueSoonCount = states.filter(
    (state) => new Date(state.dueAt).getTime() <= Date.now() + 7 * DAY_MS
  ).length;
  const matureCount = states.filter(
    (state) => state.scheduledDays >= 21
  ).length;
  const chartData = Array.from({ length: 15 }, (_, index) => {
    const day = Math.round((index / 14) * horizonDays);
    const values = stabilities.map((stability) =>
      retentionForDay(stability, day)
    );
    return {
      day,
      lower: values.length ? Math.min(...values) : null,
      median: medianStability ? retentionForDay(medianStability, day) : null,
      upper: values.length ? Math.max(...values) : null,
    };
  });

  return (
    <div className="rounded-lg border border-border/60 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-border/50 border-b px-4 py-3">
        <div>
          <p className="font-medium text-foreground text-sm">
            Stability curves
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            FSRS retention estimate from reviewed cards.
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Median</p>
            <p className="mt-0.5 font-medium text-foreground">
              {medianStability ? `${medianStability.toFixed(1)}d` : "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">7d due</p>
            <p className="mt-0.5 font-medium text-foreground">{dueSoonCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Mature</p>
            <p className="mt-0.5 font-medium text-foreground">{matureCount}</p>
          </div>
        </div>
      </div>
      <ChartContainer
        className="aspect-auto h-56 px-2 py-3"
        config={{
          lower: { color: "var(--chart-4)", label: "Weakest" },
          median: { color: "var(--chart-2)", label: "Median" },
          upper: { color: "var(--chart-1)", label: "Strongest" },
        }}
      >
        <RechartsPrimitive.LineChart
          data={chartData}
          margin={{ bottom: 8, left: 0, right: 12, top: 8 }}
        >
          <RechartsPrimitive.CartesianGrid vertical={false} />
          <RechartsPrimitive.XAxis
            dataKey="day"
            tickFormatter={(value) => `${value}d`}
            tickLine={false}
          />
          <RechartsPrimitive.YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tickLine={false}
            width={42}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <>
                    <span className="text-muted-foreground">{name}</span>
                    <span className="ml-auto font-mono text-foreground">
                      {Number(value).toFixed(0)}%
                    </span>
                  </>
                )}
                labelFormatter={(value) => `Day ${value}`}
              />
            }
          />
          <RechartsPrimitive.Line
            dataKey="upper"
            dot={false}
            stroke="var(--color-upper)"
            strokeWidth={1.5}
            type="monotone"
          />
          <RechartsPrimitive.Line
            dataKey="median"
            dot={false}
            stroke="var(--color-median)"
            strokeWidth={2}
            type="monotone"
          />
          <RechartsPrimitive.Line
            dataKey="lower"
            dot={false}
            stroke="var(--color-lower)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            type="monotone"
          />
        </RechartsPrimitive.LineChart>
      </ChartContainer>
    </div>
  );
}
