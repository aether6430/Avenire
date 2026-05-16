"use client";

import type { WidgetSpec, WidgetSpecNode } from "@avenire/ai/tools";
import { Badge } from "@avenire/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from "@avenire/ui/components/progress";
import { Separator } from "@avenire/ui/components/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avenire/ui/components/table";
import { cn } from "@/lib/utils";

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

interface PrimitiveRendererProps {
  spec: WidgetSpec;
}

const gapClass = {
  xs: "gap-1.5",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
};

const toneTextClass = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  info: "text-blue-600 dark:text-blue-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
};

const toneSurfaceClass = {
  default: "border-border/45 bg-card",
  muted: "border-border/35 bg-muted/25",
  info: "border-blue-500/20 bg-blue-500/5",
  success: "border-emerald-500/20 bg-emerald-500/5",
  warning: "border-amber-500/25 bg-amber-500/5",
  danger: "border-destructive/20 bg-destructive/5",
};

const badgeVariant = {
  default: "outline",
  muted: "secondary",
  info: "outline",
  success: "outline",
  warning: "outline",
  danger: "destructive",
} as const;

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function buildOccurrenceKey(baseKey: string, seenKeys: Map<string, number>) {
  const occurrence = seenKeys.get(baseKey) ?? 0;
  seenKeys.set(baseKey, occurrence + 1);
  return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
}

function renderNode(node: WidgetSpecNode, key: string) {
  switch (node.type) {
    case "stack":
      return (
        <div
          className={cn("flex flex-col", gapClass[node.gap ?? "md"])}
          key={key}
        >
          {node.children.map((child, index) =>
            renderNode(child, `${key}-${index}`)
          )}
        </div>
      );
    case "grid":
      return (
        <div
          className={cn("grid", gapClass[node.gap ?? "md"])}
          key={key}
          style={{
            gridTemplateColumns: `repeat(${node.columns ?? 2}, minmax(0, 1fr))`,
          }}
        >
          {node.children.map((child, index) =>
            renderNode(child, `${key}-${index}`)
          )}
        </div>
      );
    case "section":
      return (
        <section className="space-y-3" key={key}>
          {(node.title || node.description) && (
            <div className="space-y-1">
              {node.title ? (
                <h2 className="font-medium text-base">{node.title}</h2>
              ) : null}
              {node.description ? (
                <p className="text-muted-foreground text-xs/relaxed">
                  {node.description}
                </p>
              ) : null}
            </div>
          )}
          <div className="space-y-3">
            {node.children.map((child, index) =>
              renderNode(child, `${key}-${index}`)
            )}
          </div>
        </section>
      );
    case "card":
      return (
        <Card
          className={cn(toneSurfaceClass[node.tone ?? "default"])}
          key={key}
        >
          {(node.title || node.description) && (
            <CardHeader>
              {node.title ? <CardTitle>{node.title}</CardTitle> : null}
              {node.description ? (
                <CardDescription>{node.description}</CardDescription>
              ) : null}
            </CardHeader>
          )}
          {node.children?.length ? (
            <CardContent className="space-y-3">
              {node.children.map((child, index) =>
                renderNode(child, `${key}-${index}`)
              )}
            </CardContent>
          ) : null}
        </Card>
      );
    case "stat":
      return (
        <Card
          className={cn("gap-2 py-3", toneSurfaceClass[node.tone ?? "muted"])}
          key={key}
          size="sm"
        >
          <CardContent>
            <div className="text-[11px] text-muted-foreground">
              {node.label}
            </div>
            <div className="mt-1 font-medium text-2xl tracking-tight">
              {node.value}
            </div>
            {node.delta ? (
              <div
                className={cn(
                  "mt-1 text-[11px]",
                  toneTextClass[node.tone ?? "muted"]
                )}
              >
                {node.delta}
              </div>
            ) : null}
          </CardContent>
        </Card>
      );
    case "heading": {
      const level = node.level ?? "2";
      const className = cn(
        "font-medium tracking-tight",
        level === "1" && "text-xl",
        level === "2" && "text-base",
        level === "3" && "text-sm"
      );
      if (level === "1") {
        return (
          <h1 className={className} key={key}>
            {node.text}
          </h1>
        );
      }
      if (level === "3") {
        return (
          <h3 className={className} key={key}>
            {node.text}
          </h3>
        );
      }
      return (
        <h2 className={className} key={key}>
          {node.text}
        </h2>
      );
    }
    case "text":
      return (
        <p
          className={cn(
            "text-sm/relaxed",
            toneTextClass[node.tone ?? "default"],
            node.weight === "medium" && "font-medium"
          )}
          key={key}
        >
          {node.text}
        </p>
      );
    case "badge":
      return (
        <Badge
          className={cn(toneTextClass[node.tone ?? "default"])}
          key={key}
          variant={badgeVariant[node.tone ?? "default"]}
        >
          {node.text}
        </Badge>
      );
    case "callout":
      return (
        <div
          className={cn(
            "rounded-2xl border p-3",
            toneSurfaceClass[node.tone ?? "muted"]
          )}
          key={key}
        >
          {node.title ? (
            <div className="mb-1 font-medium text-sm">{node.title}</div>
          ) : null}
          {node.text ? (
            <p className="text-muted-foreground text-xs/relaxed">{node.text}</p>
          ) : null}
          {node.children?.length ? (
            <div className="mt-3 space-y-2">
              {node.children.map((child, index) =>
                renderNode(child, `${key}-${index}`)
              )}
            </div>
          ) : null}
        </div>
      );
    case "table": {
      const seenRowKeys = new Map<string, number>();

      return (
        <Table key={key}>
          {node.caption ? <TableCaption>{node.caption}</TableCaption> : null}
          <TableHeader>
            <TableRow>
              {node.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {node.rows.map((row) => {
              const rowSignature = row
                .map((cell, cellIndex) => {
                  const header = node.headers[cellIndex] ?? "value";
                  return `${header}:${String(cell ?? "")}`;
                })
                .join("\u0001");
              const rowKey = buildOccurrenceKey(
                `${key}-row-${rowSignature}`,
                seenRowKeys
              );

              return (
                <TableRow key={rowKey}>
                  {row.map((cell, cellIndex) => {
                    const header = node.headers[cellIndex] ?? "value";
                    return (
                      <TableCell
                        key={`${rowKey}-${header}:${String(cell ?? "")}`}
                      >
                        {cell ?? ""}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    }
    case "chart":
      return <PrimitiveChart key={key} node={node} />;
    case "progress":
      return (
        <div className="space-y-1.5" key={key}>
          {(node.label || Number.isFinite(node.value)) && (
            <div className="flex items-center justify-between gap-3">
              {node.label ? (
                <span className="font-medium text-xs/relaxed">
                  {node.label}
                </span>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground text-xs/relaxed tabular-nums">
                {Math.round(node.value)}%
              </span>
            </div>
          )}
          <Progress value={node.value} />
        </div>
      );
    case "divider":
      return <Separator key={key} />;
    case "code":
      return (
        <pre
          className="overflow-x-auto rounded-xl border bg-muted/30 p-3 text-xs"
          key={key}
        >
          <code>{node.code}</code>
        </pre>
      );
    case "html":
      return (
        <div
          className="contents"
          dangerouslySetInnerHTML={{ __html: node.html }}
          key={key}
        />
      );
    default:
      return null;
  }
}

function PrimitiveChart({
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

export function WidgetPrimitiveRenderer({ spec }: PrimitiveRendererProps) {
  return (
    <div className="w-full rounded-lg bg-card p-3 text-card-foreground">
      {(spec.title || spec.description) && (
        <div className="mb-4 space-y-1">
          <h1 className="font-medium text-lg tracking-tight">{spec.title}</h1>
          {spec.description ? (
            <p className="text-muted-foreground text-xs/relaxed">
              {spec.description}
            </p>
          ) : null}
        </div>
      )}
      {renderNode(spec.root, "root")}
    </div>
  );
}
