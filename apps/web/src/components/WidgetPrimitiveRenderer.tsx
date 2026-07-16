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
import createDOMPurify from "dompurify";
import type { CSSProperties } from "react";
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

type WidgetGridStyle = CSSProperties & {
  "--widget-columns": string;
};

function getWidgetGridStyle(columns: number): WidgetGridStyle {
  return {
    "--widget-columns": `repeat(${columns}, minmax(0, 1fr))`,
  };
}

const toneTextClass = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const toneSurfaceClass = {
  default: "border-border/45 bg-card",
  muted: "border-border/35 bg-muted/25",
  info: "border-info/20 bg-info/5",
  success: "border-success/20 bg-success/5",
  warning: "border-warning/25 bg-warning/5",
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

const complexityRank = new Map([
  ["O(1)", 1],
  ["O(log n)", 2],
  ["O(n)", 3],
  ["O(n log n)", 4],
  ["O(n^2)", 5],
  ["O(n²)", 5],
  ["O(2^n)", 6],
  ["O(n!)", 7],
]);

const widgetHtmlAllowedTags = [
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "caption",
  "circle",
  "code",
  "col",
  "colgroup",
  "dd",
  "defs",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "g",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "line",
  "mark",
  "ol",
  "p",
  "path",
  "polygon",
  "polyline",
  "pre",
  "rect",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "text",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
] as const;

const widgetHtmlAllowedAttributes = [
  "alt",
  "aria-describedby",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "aria-live",
  "aria-roledescription",
  "class",
  "clip-path",
  "colspan",
  "cx",
  "cy",
  "d",
  "fill",
  "focusable",
  "height",
  "href",
  "preserveAspectRatio",
  "r",
  "role",
  "rowspan",
  "scope",
  "src",
  "stroke",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-width",
  "target",
  "title",
  "viewBox",
  "width",
  "x",
  "x1",
  "xlink:href",
  "x2",
  "xmlns",
  "y",
  "y1",
  "y2",
] as const;

const widgetHtmlAllowedTagSet = new Set<string>(widgetHtmlAllowedTags);
const widgetHtmlAllowedAttributeSet = new Set<string>(
  widgetHtmlAllowedAttributes.map((attribute) => attribute.toLowerCase())
);
const widgetHtmlForbiddenTagSet = new Set([
  "audio",
  "base",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "textarea",
  "video",
]);
const widgetHtmlUrlAttributes = new Set(["href", "src", "xlink:href"]);
const widgetHtmlSafeUrlProtocols = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

let widgetHtmlPurifier: ReturnType<typeof createDOMPurify> | null = null;

function getWidgetHtmlPurifier() {
  if (!widgetHtmlPurifier) {
    widgetHtmlPurifier = createDOMPurify(window);
  }

  return widgetHtmlPurifier;
}

function isSafeWidgetHtmlUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  try {
    const url = new URL(trimmedValue, window.location.href);
    const originalHasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmedValue);

    return (
      widgetHtmlSafeUrlProtocols.has(url.protocol) ||
      !(
        originalHasProtocol ||
        ["javascript:", "vbscript:", "data:"].includes(url.protocol)
      )
    );
  } catch {
    return false;
  }
}

function enforceWidgetHtmlPolicy(root: DocumentFragment) {
  const elements = Array.from(root.querySelectorAll("*"));

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();

    if (
      widgetHtmlForbiddenTagSet.has(tagName) ||
      !widgetHtmlAllowedTagSet.has(tagName)
    ) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();

      if (
        attributeName.startsWith("on") ||
        attributeName === "style" ||
        !(
          attributeName.startsWith("aria-") ||
          widgetHtmlAllowedAttributeSet.has(attributeName)
        )
      ) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        widgetHtmlUrlAttributes.has(attributeName) &&
        !isSafeWidgetHtmlUrl(attribute.value)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

export function sanitizeWidgetHtml(html: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }

  const sanitized = getWidgetHtmlPurifier().sanitize(html, {
    ALLOW_ARIA_ATTR: true,
    ALLOW_DATA_ATTR: false,
    ALLOWED_ATTR: [...widgetHtmlAllowedAttributes],
    ALLOWED_TAGS: [...widgetHtmlAllowedTags],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$)))/i,
    FORBID_ATTR: ["style"],
    FORBID_TAGS: [...widgetHtmlForbiddenTagSet],
  });

  const template = document.createElement("template");
  template.innerHTML = sanitized;
  enforceWidgetHtmlPolicy(template.content);

  for (const link of Array.from(
    template.content.querySelectorAll('a[target="_blank"]')
  )) {
    link.setAttribute("rel", "noopener noreferrer");
  }

  return template.innerHTML;
}

function renderChildren(
  children: WidgetSpecNode[] | undefined,
  keyPrefix: string
) {
  if (!children?.length) {
    return null;
  }
  return children.map((child, index) =>
    renderNode(child, `${keyPrefix}-${index}`)
  );
}

function renderNode(node: WidgetSpecNode, key: string) {
  switch (node.type) {
    case "stack":
      return (
        <div
          className={cn("flex flex-col", gapClass[node.gap ?? "md"])}
          key={key}
        >
          {renderChildren(node.children, key)}
        </div>
      );
    case "grid":
      return (
        <div
          className={cn(
            "grid grid-cols-1 md:[grid-template-columns:var(--widget-columns)]",
            gapClass[node.gap ?? "md"]
          )}
          key={key}
          style={getWidgetGridStyle(node.columns ?? 2)}
        >
          {renderChildren(node.children, key)}
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
          <div className="space-y-3">{renderChildren(node.children, key)}</div>
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
            "rounded-lg border p-3",
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
    case "table":
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
            {node.rows.map((row, rowIndex) => (
              <TableRow key={`${key}-row-${rowIndex}`}>
                {node.headers.map((_, cellIndex) => (
                  <TableCell key={`${key}-${rowIndex}-${cellIndex}`}>
                    {row[cellIndex] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
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
          dangerouslySetInnerHTML={{ __html: sanitizeWidgetHtml(node.html) }}
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
  const seriesFormatters = new Map<string, Map<number, string>>();
  const data = node.data.map((row) => {
    const next = { ...row };

    for (const series of node.series) {
      const value = row[series.dataKey];
      if (typeof value !== "string") {
        continue;
      }

      const normalized = value.replace(/\s+/g, " ").trim();
      const rankedValue = complexityRank.get(normalized);
      if (!rankedValue) {
        continue;
      }

      next[series.dataKey] = rankedValue;
      const formatter =
        seriesFormatters.get(series.dataKey) ?? new Map<number, string>();
      formatter.set(rankedValue, normalized);
      seriesFormatters.set(series.dataKey, formatter);
    }

    return next;
  });
  const config = node.series.reduce<ChartConfig>((acc, series, index) => {
    acc[series.dataKey] = {
      label: series.label ?? series.dataKey,
      color: chartColors[index % chartColors.length],
    };
    return acc;
  }, {});
  const chartType = node.chartType ?? node.series[0]?.type ?? "line";
  const valueFormatter =
    node.series.length === 1
      ? seriesFormatters.get(node.series[0]?.dataKey ?? "")
      : undefined;
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        axisLine={false}
        dataKey={node.indexKey}
        interval={0}
        minTickGap={8}
        tickLine={false}
      />
      <YAxis
        axisLine={false}
        tickFormatter={
          valueFormatter
            ? (value) => valueFormatter.get(Number(value)) ?? String(value)
            : undefined
        }
        tickLine={false}
        width={76}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  );

  return (
    <section className="space-y-3">
      {node.title ? (
        <h3 className="font-medium text-sm">{node.title}</h3>
      ) : null}
      <ChartContainer className="h-[260px] w-full" config={config}>
        {chartType === "bar" ? (
          <BarChart accessibilityLayer data={data}>
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
          <AreaChart accessibilityLayer data={data}>
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
          <LineChart accessibilityLayer data={data}>
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
    </section>
  );
}

export function WidgetPrimitiveRenderer({ spec }: PrimitiveRendererProps) {
  return (
    <div className="w-full space-y-4 p-3 text-card-foreground">
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
