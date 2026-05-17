"use client";

import type { WidgetSpecNode } from "@avenire/ai/tools";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avenire/ui/components/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  RechartsPrimitive,
} from "@avenire/ui/components/chart";

const {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} = RechartsPrimitive;

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function WidgetPrimitiveChart({
  node,
}: {
  node: Extract<WidgetSpecNode, { type: "chart" }>;
}) {
  const config = node.series.reduce<ChartConfig>((acc, series, index) => {
    acc[series.dataKey] = {
      label: series.label ?? series.dataKey,
      color: series.color ?? chartColors[index % chartColors.length],
    };
    return acc;
  }, {});
  const chartType = node.chartType ?? node.series[0]?.type ?? "line";
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis axisLine={false} dataKey={node.indexKey} tickLine={false} />
      <YAxis axisLine={false} tickLine={false} width={36} />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  );

  return (
    <Card>
      {node.title ? (
        <CardHeader>
          <CardTitle>{node.title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
        <ChartContainer className="h-[260px] w-full" config={config}>
          {chartType === "bar" ? (
            <BarChart accessibilityLayer data={node.data}>
              {common}
              {node.series.map((series, index) => (
                <Bar
                  dataKey={series.dataKey}
                  fill={`var(--color-${series.dataKey})`}
                  key={series.dataKey}
                  radius={index === 0 ? [4, 4, 0, 0] : 4}
                />
              ))}
            </BarChart>
          ) : chartType === "area" ? (
            <AreaChart accessibilityLayer data={node.data}>
              {common}
              {node.series.map((series) => (
                <Area
                  dataKey={series.dataKey}
                  fill={`var(--color-${series.dataKey})`}
                  fillOpacity={0.18}
                  key={series.dataKey}
                  stroke={`var(--color-${series.dataKey})`}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart accessibilityLayer data={node.data}>
              {common}
              {node.series.map((series) => (
                <Line
                  dataKey={series.dataKey}
                  dot={false}
                  key={series.dataKey}
                  stroke={`var(--color-${series.dataKey})`}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
