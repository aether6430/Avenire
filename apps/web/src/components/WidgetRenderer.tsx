"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WidgetRendererProps {
  className?: string;
  /** Raw HTML/CSS/JS fragment from the AI */
  html: string;
  /** Whether the widget is still streaming (used for shimmer). */
  isStreaming?: boolean;
  /** Called when the widget calls openLink(url) */
  onOpenLink?: (url: string) => void;
  /** Called when the widget calls sendMessage(text) */
  onSendMessage?: (text: string) => void;
  /** Run inline scripts after content updates (disable during streaming). */
  runScripts?: boolean;
}

export const CANVAS_WIDGET_SANDBOX = "allow-scripts";
export const CANVAS_WIDGET_ALLOWED_SCRIPT_ORIGINS: readonly string[] = [
  "https://cdn.jsdelivr.net",
  "https://cdnjs.cloudflare.com",
  "https://esm.sh",
];
export const CANVAS_WIDGET_CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' ${CANVAS_WIDGET_ALLOWED_SCRIPT_ORIGINS.join(" ")}`,
  "style-src 'unsafe-inline'",
  "img-src data: blob: https:",
  "font-src data: https:",
  "media-src data: blob: https:",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

// ---------------------------------------------------------------------------
// CSS variable extraction
// ---------------------------------------------------------------------------

/**
 * Theme tokens the canvas iframe must receive. Explicit names matter: some
 * Android browsers omit custom properties when iterating CSSStyleDeclaration,
 * which left widgets with black SVG fills and unreadable control text.
 */
export const CANVAS_THEME_VAR_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--hover",
  "--active",
  "--info",
  "--info-foreground",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--radius",
  "--font-sans",
  "--font-serif",
  "--font-mono",
  "--color-text-default",
  "--color-bg-default",
  "--color-pill-default",
  "--color-text-gray",
  "--color-bg-gray",
  "--color-pill-gray",
  "--color-text-brown",
  "--color-bg-brown",
  "--color-pill-brown",
  "--color-text-orange",
  "--color-bg-orange",
  "--color-pill-orange",
  "--color-text-yellow",
  "--color-bg-yellow",
  "--color-pill-yellow",
  "--color-text-green",
  "--color-bg-green",
  "--color-pill-green",
  "--color-text-blue",
  "--color-bg-blue",
  "--color-pill-blue",
  "--color-text-purple",
  "--color-bg-purple",
  "--color-pill-purple",
  "--color-text-pink",
  "--color-bg-pink",
  "--color-pill-pink",
  "--color-text-red",
  "--color-bg-red",
  "--color-pill-red",
] as const;

type CanvasThemeVarName = (typeof CANVAS_THEME_VAR_NAMES)[number];

const LIGHT_THEME_FALLBACKS: Partial<Record<CanvasThemeVarName, string>> = {
  "--background": "#fcfcfc",
  "--foreground": "rgba(20, 20, 20, 0.94)",
  "--card": "#fcfcfc",
  "--card-foreground": "rgba(20, 20, 20, 0.94)",
  "--popover": "#fcfcfc",
  "--popover-foreground": "rgba(20, 20, 20, 0.94)",
  "--primary": "#abc4ff",
  "--primary-foreground": "rgba(20, 20, 20, 0.94)",
  "--secondary": "#f8f8f8",
  "--secondary-foreground": "rgba(20, 20, 20, 0.74)",
  "--muted": "#f8f8f8",
  "--muted-foreground": "rgba(20, 20, 20, 0.54)",
  "--accent": "rgba(20, 20, 20, 0.08)",
  "--accent-foreground": "rgba(20, 20, 20, 0.94)",
  "--destructive": "#cf2d56",
  "--destructive-foreground": "#fcfcfc",
  "--border": "rgba(20, 20, 20, 0.08)",
  "--input": "rgba(20, 20, 20, 0.12)",
  "--ring": "#abc4ff",
  "--hover": "rgba(20, 20, 20, 0.04)",
  "--active": "rgba(20, 20, 20, 0.08)",
  "--info": "#0b6e99",
  "--info-foreground": "#0b6e99",
  "--success": "#0f7b6c",
  "--success-foreground": "#0f7b6c",
  "--warning": "#dfab01",
  "--warning-foreground": "#dfab01",
  "--chart-1": "#e89a62",
  "--chart-2": "#71b8c9",
  "--chart-3": "#d982b5",
  "--chart-4": "#b88f78",
  "--chart-5": "#9b8ac4",
  "--radius": "0.375rem",
  "--font-sans":
    '"Inter", ui-sans-serif, -apple-system, "Segoe UI", sans-serif',
  "--color-text-default": "#37352f",
  "--color-bg-default": "#ffffff",
  "--color-pill-default": "rgba(206, 205, 202, 0.5)",
  "--color-text-gray": "#9b9a97",
  "--color-bg-gray": "#ebeced",
  "--color-pill-gray": "rgba(155, 154, 151, 0.4)",
  "--color-text-brown": "#64473a",
  "--color-bg-brown": "#e9e5e3",
  "--color-pill-brown": "rgba(140, 46, 0, 0.2)",
  "--color-text-orange": "#d9730d",
  "--color-bg-orange": "#faebdd",
  "--color-pill-orange": "rgba(245, 93, 0, 0.2)",
  "--color-text-yellow": "#dfab01",
  "--color-bg-yellow": "#fbf3db",
  "--color-pill-yellow": "rgba(233, 168, 0, 0.2)",
  "--color-text-green": "#0f7b6c",
  "--color-bg-green": "#ddedea",
  "--color-pill-green": "rgba(0, 135, 107, 0.2)",
  "--color-text-blue": "#0b6e99",
  "--color-bg-blue": "#ddebf1",
  "--color-pill-blue": "rgba(0, 120, 223, 0.2)",
  "--color-text-purple": "#6940a5",
  "--color-bg-purple": "#eae4f2",
  "--color-pill-purple": "rgba(103, 36, 222, 0.2)",
  "--color-text-pink": "#ad1a72",
  "--color-bg-pink": "#f4dfeb",
  "--color-pill-pink": "rgba(221, 0, 129, 0.2)",
  "--color-text-red": "#e03e3e",
  "--color-bg-red": "#fbe4e4",
  "--color-pill-red": "rgba(255, 0, 26, 0.2)",
};

const DARK_THEME_FALLBACKS: Partial<Record<CanvasThemeVarName, string>> = {
  "--background": "#141414",
  "--foreground": "rgba(228, 228, 228, 0.92)",
  "--card": "#181818",
  "--card-foreground": "rgba(228, 228, 228, 0.92)",
  "--popover": "#181818",
  "--popover-foreground": "rgba(228, 228, 228, 0.92)",
  "--primary": "#abc4ff",
  "--primary-foreground": "#191919",
  "--secondary": "#181818",
  "--secondary-foreground": "rgba(228, 228, 228, 0.55)",
  "--muted": "#181818",
  "--muted-foreground": "rgba(228, 228, 228, 0.37)",
  "--accent": "rgba(228, 228, 228, 0.07)",
  "--accent-foreground": "rgba(228, 228, 228, 0.92)",
  "--destructive": "#fc6b83",
  "--destructive-foreground": "#191919",
  "--border": "rgba(228, 228, 228, 0.08)",
  "--input": "rgba(228, 228, 228, 0.12)",
  "--ring": "#abc4ff",
  "--hover": "rgba(228, 228, 228, 0.04)",
  "--active": "rgba(228, 228, 228, 0.08)",
  "--info": "#529cca",
  "--info-foreground": "#529cca",
  "--success": "#4dab9a",
  "--success-foreground": "#4dab9a",
  "--warning": "#ffdc49",
  "--warning-foreground": "#ffdc49",
  "--chart-1": "#f0a873",
  "--chart-2": "#78c4d5",
  "--chart-3": "#ed84bd",
  "--chart-4": "#c39a82",
  "--chart-5": "#a99ad1",
  "--radius": "0.5rem",
  "--font-sans":
    '"Inter", ui-sans-serif, -apple-system, "Segoe UI", sans-serif',
  "--color-text-default": "rgba(255, 255, 255, 0.9)",
  "--color-bg-default": "#2f3437",
  "--color-pill-default": "rgba(206, 205, 202, 0.5)",
  "--color-text-gray": "rgba(151, 154, 155, 0.95)",
  "--color-bg-gray": "#454b4e",
  "--color-pill-gray": "rgba(151, 154, 155, 0.5)",
  "--color-text-brown": "#937264",
  "--color-bg-brown": "#434040",
  "--color-pill-brown": "rgba(147, 114, 100, 0.5)",
  "--color-text-orange": "#ffa344",
  "--color-bg-orange": "#594a3a",
  "--color-pill-orange": "rgba(255, 163, 68, 0.5)",
  "--color-text-yellow": "#ffdc49",
  "--color-bg-yellow": "#59563b",
  "--color-pill-yellow": "rgba(255, 220, 73, 0.5)",
  "--color-text-green": "#4dab9a",
  "--color-bg-green": "#354c4b",
  "--color-pill-green": "rgba(77, 171, 154, 0.5)",
  "--color-text-blue": "#529cca",
  "--color-bg-blue": "#364954",
  "--color-pill-blue": "rgba(82, 156, 202, 0.5)",
  "--color-text-purple": "#9a6dd7",
  "--color-bg-purple": "#443f57",
  "--color-pill-purple": "rgba(154, 109, 215, 0.5)",
  "--color-text-pink": "#e255a1",
  "--color-bg-pink": "#533b4c",
  "--color-pill-pink": "rgba(226, 85, 161, 0.5)",
  "--color-text-red": "#ff7369",
  "--color-bg-red": "#594141",
  "--color-pill-red": "rgba(255, 115, 105, 0.5)",
};

/**
 * Convert #RRGGBBAA / #RGBA hex-with-alpha to rgba() for Android WebView /
 * Chrome versions that mishandle alpha hex inside sandboxed srcdoc iframes.
 */
export function normalizeCssColorValue(value: string): string {
  const trimmed = value.trim();
  const hexAlpha = /^#(?:([0-9a-f]{8})|([0-9a-f]{4}))$/i.exec(trimmed);
  const raw = hexAlpha?.[1] ?? hexAlpha?.[2];
  if (raw) {
    const hex =
      raw.length === 4
        ? raw
            .split("")
            .map((channel) => channel + channel)
            .join("")
        : raw;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const a = Number.parseInt(hex.slice(6, 8), 16) / 255;
    const alpha = Math.round(a * 1000) / 1000;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return trimmed;
}

function serializeCssVarBlock(
  vars: Record<string, string | undefined>
): string {
  const declarations = Object.entries(vars)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
}

export function buildFallbackThemeBlock(isDark: boolean): string {
  return serializeCssVarBlock(
    isDark ? DARK_THEME_FALLBACKS : LIGHT_THEME_FALLBACKS
  );
}

/**
 * Reads theme CSS custom properties from the host document's :root.
 * Uses an explicit token list first (Android-safe), then merges any extra
 * custom properties discovered via iteration.
 */
export function extractThemeVars(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const vars: Record<string, string> = {};

  for (const name of CANVAS_THEME_VAR_NAMES) {
    const val = style.getPropertyValue(name).trim();
    if (val) {
      vars[name] = normalizeCssColorValue(val);
    }
  }

  // Best-effort: pick up any additional custom properties on engines that
  // expose them through CSSStyleDeclaration indexing.
  for (let i = 0; i < style.length; i += 1) {
    const name = style[i];
    if (!name?.startsWith("--") || name in vars) {
      continue;
    }
    const val = style.getPropertyValue(name).trim();
    if (val) {
      vars[name] = normalizeCssColorValue(val);
    }
  }

  return vars;
}

/**
 * Serializes CSS vars into a :root { ... } block to inject into the iframe.
 */
export function buildCssVarBlock(vars: Record<string, string>): string {
  const normalized = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, normalizeCssColorValue(v)])
  );
  return serializeCssVarBlock(normalized);
}

function buildCanvasThemeBlock(isDark: boolean): string {
  const canvasVars = {
    "--canvas-background": "var(--background)",
    "--canvas-surface": "var(--card)",
    "--canvas-text": "var(--foreground)",
    "--canvas-muted": "var(--muted-foreground)",
    "--canvas-border": "var(--border)",
    "--canvas-primary": "var(--primary)",
    "--canvas-primary-foreground": "var(--primary-foreground)",
    "--canvas-accent": "var(--secondary)",
    "--canvas-accent-foreground": "var(--secondary-foreground)",
    // Prefer srgb color-mix — oklch mixes are less reliable in Android WebViews.
    "--canvas-grid": isDark
      ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
      : "color-mix(in srgb, var(--foreground) 8%, transparent)",
    "--canvas-grid-strong": isDark
      ? "color-mix(in srgb, var(--foreground) 20%, transparent)"
      : "color-mix(in srgb, var(--foreground) 16%, transparent)",
    "--p": "var(--primary)",
    "--s": "var(--secondary)",
    "--t": "var(--foreground)",
    "--bg2": "var(--secondary)",
    "--b": "var(--border)",
    "--color-background-primary": "var(--background)",
    "--color-background-secondary": "var(--secondary)",
    "--color-background-tertiary": "var(--muted)",
    "--color-background-info": "var(--color-bg-blue)",
    "--color-background-danger": "var(--color-bg-red)",
    "--color-background-success": "var(--color-bg-green)",
    "--color-background-warning": "var(--color-bg-yellow)",
    "--color-text-primary": "var(--foreground)",
    "--color-text-secondary": "var(--muted-foreground)",
    "--color-text-tertiary": "var(--color-text-gray)",
    "--color-text-info": "var(--color-text-blue)",
    "--color-text-danger": "var(--color-text-red)",
    "--color-text-success": "var(--color-text-green)",
    "--color-text-warning": "var(--color-text-yellow)",
    "--color-border-tertiary":
      "color-mix(in srgb, var(--foreground) 15%, transparent)",
    "--color-border-secondary":
      "color-mix(in srgb, var(--foreground) 30%, transparent)",
    "--color-border-primary":
      "color-mix(in srgb, var(--foreground) 40%, transparent)",
    "--color-border-info": "color-mix(in srgb, var(--info) 35%, transparent)",
    "--color-border-danger":
      "color-mix(in srgb, var(--destructive) 35%, transparent)",
    "--color-border-success":
      "color-mix(in srgb, var(--success) 35%, transparent)",
    "--color-border-warning":
      "color-mix(in srgb, var(--warning) 35%, transparent)",
  };

  return serializeCssVarBlock(canvasVars);
}

// ---------------------------------------------------------------------------
// SVG pre-built classes
// These mirror the classes documented in REFERENCE.md so SVG widgets work
// without needing Chart.js or any library.
// ---------------------------------------------------------------------------

const SVG_CLASSES = `
svg { display: block; width: 100%; max-width: 100%; height: auto; overflow: visible; }
svg .t  { font-family: var(--font-sans, sans-serif); font-size: 14px; font-weight: 400; fill: var(--foreground) !important; }
svg .ts { font-family: var(--font-sans, sans-serif); font-size: 12px; font-weight: 400; fill: var(--muted-foreground) !important; }
svg .th { font-family: var(--font-sans, sans-serif); font-size: 14px; font-weight: 500; fill: var(--foreground) !important; }
svg .arr { fill: none !important; stroke: var(--muted-foreground) !important; stroke-width: 1.5px; }
svg .leader { fill: none !important; stroke: var(--muted-foreground) !important; stroke-width: 0.5px; stroke-dasharray: 4 3; }
svg .node { cursor: pointer; }
svg .node:hover { opacity: 0.75; }

/* ── SVG color ramps (using Notion semantic CSS variables) ── */
svg .c-default > rect,
svg .c-default > circle,
svg .c-default > ellipse,
svg rect.c-default,
svg circle.c-default,
svg ellipse.c-default { fill: var(--color-bg-default) !important; stroke: var(--color-pill-default) !important; }
svg .c-default > .t,
svg .c-default > .th { fill: var(--color-text-default) !important; }
svg .c-default > .ts { fill: var(--color-text-default) !important; opacity: 0.8; }

svg .c-gray > rect,
svg .c-gray > circle,
svg .c-gray > ellipse,
svg rect.c-gray,
svg circle.c-gray,
svg ellipse.c-gray { fill: var(--color-bg-gray) !important; stroke: var(--color-pill-gray) !important; }
svg .c-gray > .t,
svg .c-gray > .th { fill: var(--color-text-gray) !important; }
svg .c-gray > .ts { fill: var(--color-text-gray) !important; opacity: 0.8; }

svg .c-brown > rect,
svg .c-brown > circle,
svg .c-brown > ellipse,
svg rect.c-brown,
svg circle.c-brown,
svg ellipse.c-brown { fill: var(--color-bg-brown) !important; stroke: var(--color-pill-brown) !important; }
svg .c-brown > .t,
svg .c-brown > .th { fill: var(--color-text-brown) !important; }
svg .c-brown > .ts { fill: var(--color-text-brown) !important; opacity: 0.8; }

svg .c-orange > rect,
svg .c-orange > circle,
svg .c-orange > ellipse,
svg rect.c-orange,
svg circle.c-orange,
svg ellipse.c-orange { fill: var(--color-bg-orange) !important; stroke: var(--color-pill-orange) !important; }
svg .c-orange > .t,
svg .c-orange > .th { fill: var(--color-text-orange) !important; }
svg .c-orange > .ts { fill: var(--color-text-orange) !important; opacity: 0.8; }

svg .c-yellow > rect,
svg .c-yellow > circle,
svg .c-yellow > ellipse,
svg rect.c-yellow,
svg circle.c-yellow,
svg ellipse.c-yellow { fill: var(--color-bg-yellow) !important; stroke: var(--color-pill-yellow) !important; }
svg .c-yellow > .t,
svg .c-yellow > .th { fill: var(--color-text-yellow) !important; }
svg .c-yellow > .ts { fill: var(--color-text-yellow) !important; opacity: 0.8; }

svg .c-purple > rect,
svg .c-purple > circle,
svg .c-purple > ellipse,
svg rect.c-purple,
svg circle.c-purple,
svg ellipse.c-purple { fill: var(--color-bg-purple) !important; stroke: var(--color-pill-purple) !important; }
svg .c-purple > .t,
svg .c-purple > .th { fill: var(--color-text-purple) !important; }
svg .c-purple > .ts { fill: var(--color-text-purple) !important; opacity: 0.8; }

svg .c-teal > rect,
svg .c-teal > circle,
svg .c-teal > ellipse,
svg rect.c-teal,
svg circle.c-teal,
svg ellipse.c-teal { fill: var(--color-bg-green) !important; stroke: var(--color-pill-green) !important; }
svg .c-teal > .t,
svg .c-teal > .th { fill: var(--color-text-green) !important; }
svg .c-teal > .ts { fill: var(--color-text-green) !important; opacity: 0.8; }

svg .c-coral > rect,
svg .c-coral > circle,
svg .c-coral > ellipse,
svg rect.c-coral,
svg circle.c-coral,
svg ellipse.c-coral { fill: var(--color-bg-orange) !important; stroke: var(--color-pill-orange) !important; }
svg .c-coral > .t,
svg .c-coral > .th { fill: var(--color-text-orange) !important; }
svg .c-coral > .ts { fill: var(--color-text-orange) !important; opacity: 0.8; }

svg .c-pink > rect,
svg .c-pink > circle,
svg .c-pink > ellipse,
svg rect.c-pink,
svg circle.c-pink,
svg ellipse.c-pink { fill: var(--color-bg-pink) !important; stroke: var(--color-pill-pink) !important; }
svg .c-pink > .t,
svg .c-pink > .th { fill: var(--color-text-pink) !important; }
svg .c-pink > .ts { fill: var(--color-text-pink) !important; opacity: 0.8; }

svg .c-blue > rect,
svg .c-blue > circle,
svg .c-blue > ellipse,
svg rect.c-blue,
svg circle.c-blue,
svg ellipse.c-blue { fill: var(--color-bg-blue) !important; stroke: var(--color-pill-blue) !important; }
svg .c-blue > .t,
svg .c-blue > .th { fill: var(--color-text-blue) !important; }
svg .c-blue > .ts { fill: var(--color-text-blue) !important; opacity: 0.8; }

svg .c-green > rect,
svg .c-green > circle,
svg .c-green > ellipse,
svg rect.c-green,
svg circle.c-green,
svg ellipse.c-green { fill: var(--color-bg-green) !important; stroke: var(--color-pill-green) !important; }
svg .c-green > .t,
svg .c-green > .th { fill: var(--color-text-green) !important; }
svg .c-green > .ts { fill: var(--color-text-green) !important; opacity: 0.8; }

svg .c-amber > rect,
svg .c-amber > circle,
svg .c-amber > ellipse,
svg rect.c-amber,
svg circle.c-amber,
svg ellipse.c-amber { fill: var(--color-bg-yellow) !important; stroke: var(--color-pill-yellow) !important; }
svg .c-amber > .t,
svg .c-amber > .th { fill: var(--color-text-yellow) !important; }
svg .c-amber > .ts { fill: var(--color-text-yellow) !important; opacity: 0.8; }

svg .c-red > rect,
svg .c-red > circle,
svg .c-red > ellipse,
svg rect.c-red,
svg circle.c-red,
svg ellipse.c-red { fill: var(--color-bg-red) !important; stroke: var(--color-pill-red) !important; }
svg .c-red > .t,
svg .c-red > .th { fill: var(--color-text-red) !important; }
svg .c-red > .ts { fill: var(--color-text-red) !important; opacity: 0.8; }

svg .c-black > rect,
svg .c-black > circle,
svg .c-black > ellipse,
svg rect.c-black,
svg circle.c-black,
svg ellipse.c-black { fill: var(--foreground) !important; stroke: var(--border) !important; }
svg .c-black > .t,
svg .c-black > .th { fill: var(--background) !important; }
svg .c-black > .ts { fill: var(--background) !important; opacity: 0.8; }

svg .box > rect,
svg .box > circle,
svg .box > ellipse,
svg rect.box,
svg circle.box,
svg ellipse.box { fill: var(--secondary) !important; stroke: var(--border) !important; }
svg .box > .t,
svg .box > .th,
svg .box > .ts { fill: var(--foreground) !important; }
`;

// ---------------------------------------------------------------------------
// Base HTML shell injected into the iframe
// ---------------------------------------------------------------------------

export function buildCanvasWidgetDocument(
  cssVarBlock: string,
  isDark: boolean
): string {
  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? "dark" : ""}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${isDark ? "dark" : "light"}">
<meta http-equiv="Content-Security-Policy" content="${CANVAS_WIDGET_CSP}">
<style id="avenire-theme-fallbacks">
/* Concrete tokens so Android still paints if host var extraction is empty. */
${buildFallbackThemeBlock(isDark)}
</style>
<style>
/* ── Base reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  color-scheme: ${isDark ? "dark" : "light"};
}

html, body {
  background: var(--canvas-background, var(--card, ${isDark ? "#181818" : "#fcfcfc"}));
  color: var(--canvas-text, var(--foreground, ${isDark ? "rgba(228, 228, 228, 0.92)" : "rgba(20, 20, 20, 0.94)"}));
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  min-height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 12px;
  -webkit-tap-highlight-color: transparent;
}

/* Keep theme fills/text when forced-colors is active (Android/high-contrast). */
@media (forced-colors: active) {
  html, body {
    forced-color-adjust: none;
    background: var(--canvas-background, var(--card));
    color: var(--canvas-text, var(--foreground));
  }
}

/* ── Form element defaults matching shadcn aesthetic ── */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--border) !important;
  outline: none;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--primary) !important;
  border: 2px solid var(--background);
  box-shadow: 0 0 0 1px var(--primary);
  cursor: pointer;
  transition: transform .1s;
}
input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }

input[type="range"]::-moz-range-thumb {
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--primary) !important;
  border: 2px solid var(--background);
  cursor: pointer;
}

input[type="checkbox"] {
  accent-color: var(--primary);
  cursor: pointer;
  width: 14px; height: 14px;
}

input[type="text"],
input[type="number"],
textarea {
  background: var(--input) !important;
  color: var(--foreground) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 13px;
  font-family: var(--font-sans, sans-serif);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
input[type="text"]:focus,
input[type="number"]:focus,
textarea:focus {
  border-color: var(--ring) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 30%, transparent) !important;
}

select {
  background: var(--background) !important;
  color: var(--foreground) !important;
  border: 1px solid var(--border) !important;
  border-radius: calc(var(--radius) - 2px);
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  outline: none;
  transition: border-color .15s;
}
select:hover  { border-color: var(--ring) !important; }
select:focus  { border-color: var(--ring) !important; }

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  font-family: var(--font-sans, sans-serif);
  background: var(--secondary) !important;
  color: var(--foreground) !important;
  border: 1px solid color-mix(in srgb, var(--foreground) 18%, transparent) !important;
  cursor: pointer;
  transition: opacity .15s, background .15s, transform .1s;
}
button:active { transform: scale(.97); }
button:hover { background: var(--input) !important; }
button[aria-pressed="true"], button[aria-selected="true"], button[data-active="true"] {
  background: var(--foreground) !important;
  color: var(--background) !important;
  border-color: var(--foreground) !important;
}
button:disabled { opacity: .6; cursor: not-allowed; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.btn-primary { background: var(--primary) !important; color: var(--primary-foreground) !important; border-color: var(--primary) !important; }
.btn-ghost { background: transparent !important; border-color: transparent !important; }
canvas { display: block; max-width: 100%; }

/* ── Visualization utilities ── */
.card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
.viz-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.viz-row, .viz-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.viz-controls { align-items: end; margin-bottom: 16px; }
.viz-stat { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.viz-stat-value { color: var(--foreground); font-size: 24px; font-weight: 500; line-height: 1.2; }
.viz-badge { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; color: var(--muted-foreground); font-size: 12px; }
.btn-block { width: 100%; }
.form-label { display: block; color: var(--muted-foreground); font-size: 13px; margin-bottom: 4px; }
.form-check, .form-switch { display: inline-flex; align-items: center; gap: 8px; }
.form-control, .form-select { min-width: 0; }
.form-range { min-width: 140px; }
.text-small { font-size: 12px; }
.text-muted { color: var(--muted-foreground); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

/* ── SVG pre-built classes ── */
${SVG_CLASSES}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

@keyframes _fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
<style id="avenire-css-vars">
${cssVarBlock}
</style>
<style id="avenire-canvas-vars">
${buildCanvasThemeBlock(isDark)}
</style>
</head>
<body>
<div id="root"></div>

<script>
/* ── Avenire globals ── */
window.sendMessage = function(text) {
  window.parent.postMessage({ type: 'avenire:sendMessage', text }, '*');
};
window.sendPrompt = function(text) {
  window.sendMessage(text);
};
window.openLink = function(url) {
  window.parent.postMessage({ type: 'avenire:openLink', url }, '*');
};

/* ── Morphdom render pipeline ── */
window._morphReady = false;
window._pending = null;
window._waitForLayout = async function() {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {
      // Ignore font loading failures; layout still needs to continue.
    }
  }
  await new Promise(function(resolve) {
    window.requestAnimationFrame(function() {
      window.requestAnimationFrame(resolve);
    });
  });
};
window._setContent = function(html, runScripts) {
  if (!window._morphReady) {
    window._pending = { html: html, runScripts: !!runScripts };
    return;
  }
  var root = document.getElementById('root');
  var target = document.createElement('div');
  target.id = 'root';
  target.innerHTML = html;
  morphdom(root, target, {
    onBeforeElUpdated: function(from, to) {
      if (from.isEqualNode(to)) return false;
      return true;
    },
    onNodeAdded: function(node) {
      if (node && node.nodeType === 1) {
        node.style.animation = '_fadeIn 0.22s ease both';
      }
      return node;
    },
  });
  if (runScripts) {
    window._runScripts();
  } else {
    reportHeight();
  }
};
window._runScripts = async function() {
  await window._waitForLayout();
  var scripts = Array.prototype.slice.call(document.querySelectorAll('#root script'));
  for (var i = 0; i < scripts.length; i += 1) {
    var old = scripts[i];
    var s = document.createElement('script');
    Array.from(old.attributes || []).forEach(function(attr) {
      s.setAttribute(attr.name, attr.value);
    });
    if (!old.hasAttribute('async') && !old.hasAttribute('defer') && old.type !== 'module') {
      s.async = false;
    }
    var parent = old.parentNode;
    if (!parent) continue;
    if (!s.src) {
      s.textContent = old.textContent;
    }
    parent.replaceChild(s, old);

    if (s.src) {
      await new Promise(function(resolve) {
        s.addEventListener('load', resolve, { once: true });
        s.addEventListener('error', resolve, { once: true });
      });
    }
  }
  reportHeight();
};
window._applyCssVars = function(cssText) {
  var style = document.getElementById('avenire-css-vars');
  if (style) style.textContent = cssText;
  window.avenireTheme = window._readTheme();
  window.dispatchEvent(new Event('avenire:themechange'));
  reportHeight();
};

window._readTheme = function() {
  var rootStyle = getComputedStyle(document.documentElement);
  return {
    mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    background: rootStyle.getPropertyValue('--canvas-background').trim() || rootStyle.getPropertyValue('--background').trim() || '#ffffff',
    surface: rootStyle.getPropertyValue('--canvas-surface').trim() || rootStyle.getPropertyValue('--card').trim() || '#ffffff',
    text: rootStyle.getPropertyValue('--canvas-text').trim() || rootStyle.getPropertyValue('--foreground').trim() || '#37352f',
    muted: rootStyle.getPropertyValue('--canvas-muted').trim() || rootStyle.getPropertyValue('--muted-foreground').trim() || '#9b9a97',
    border: rootStyle.getPropertyValue('--canvas-border').trim() || rootStyle.getPropertyValue('--border').trim() || 'rgba(55, 53, 47, 0.09)',
    primary: rootStyle.getPropertyValue('--canvas-primary').trim() || rootStyle.getPropertyValue('--primary').trim() || '#e89a62',
    primaryForeground: rootStyle.getPropertyValue('--canvas-primary-foreground').trim() || rootStyle.getPropertyValue('--primary-foreground').trim() || '#1b2733',
    accent: rootStyle.getPropertyValue('--canvas-accent').trim() || rootStyle.getPropertyValue('--secondary').trim() || '#fafafa',
    accentForeground: rootStyle.getPropertyValue('--canvas-accent-foreground').trim() || rootStyle.getPropertyValue('--secondary-foreground').trim() || '#37352f',
    grid: rootStyle.getPropertyValue('--canvas-grid').trim() || 'rgba(0,0,0,0.08)',
    gridStrong: rootStyle.getPropertyValue('--canvas-grid-strong').trim() || 'rgba(0,0,0,0.16)',
  };
};

window.avenireTheme = window._readTheme();

window.addEventListener('message', function(event) {
  var data = event.data || {};
  if (data.type === 'avenire:setContent' && typeof data.html === 'string') {
    window._setContent(data.html, !!data.runScripts);
    return;
  }
  if (data.type === 'avenire:setCssVars' && typeof data.cssText === 'string') {
    window._applyCssVars(data.cssText);
    return;
  }
});

/* ── Auto-resize: tell parent our scroll height ── */
function reportHeight() {
  const root = document.getElementById('root');
  if (!root) return;
  const bodyStyle = getComputedStyle(document.body);
  const paddingY =
    parseFloat(bodyStyle.paddingTop || '0') + parseFloat(bodyStyle.paddingBottom || '0');
  const h = Math.ceil(root.scrollHeight + paddingY);
  window.parent.postMessage({ type: 'avenire:resize', height: h }, '*');
}

const ro = new ResizeObserver(reportHeight);
ro.observe(document.getElementById('root') || document.body);
reportHeight();
window.addEventListener('resize', reportHeight);

/* ── Intercept <a> clicks ── */
document.addEventListener('click', function(e) {
  const a = e.target.closest('a[href]');
  if (a && a.href && !a.href.startsWith('javascript')) {
    e.preventDefault();
    window.openLink(a.href);
  }
});
</script>
<script src="https://cdn.jsdelivr.net/npm/morphdom@2.7.4/dist/morphdom-umd.min.js"
  onload="window._morphReady=true;if(window._pending){window._setContent(window._pending.html, window._pending.runScripts);window._pending=null;}"></script>
</body>
</html>`;
}

function normalizeWidgetHtmlPayload(value: string): string {
  const trimmed = value.trim();
  const unfenced = trimmed
    .replace(/^```(?:html|svg|xml|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!unfenced.startsWith("{")) {
    return unfenced || value;
  }

  try {
    const parsed = JSON.parse(unfenced) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      const record = parsed as Record<string, unknown>;
      const widget =
        typeof record.widget === "object" && record.widget !== null
          ? (record.widget as Record<string, unknown>)
          : null;
      const candidates = [
        widget?.code,
        widget?.widget_code,
        record.widget_code,
        record.html,
        record.code,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
    }
  } catch {
    return unfenced || value;
  }

  return unfenced || value;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WidgetRenderer({
  html,
  onSendMessage,
  onOpenLink,
  runScripts = true,
  isStreaming = false,
  className = "",
}: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoHeightRef = useRef<number>(320);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isReadyRef = useRef(false);
  const normalizedHtml = useMemo(
    () => normalizeWidgetHtmlPayload(html),
    [html]
  );

  const postToIframe = useCallback((data: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      return;
    }
    iframe.contentWindow.postMessage(data, "*");
  }, []);

  const writeCssVars = useCallback(() => {
    const vars = extractThemeVars();
    const cssVarBlock = buildCssVarBlock(vars);
    postToIframe({ type: "avenire:setCssVars", cssText: cssVarBlock });
  }, [postToIframe]);

  const writeContent = useCallback(
    (nextHtml: string, shouldRunScripts: boolean) => {
      postToIframe({
        type: "avenire:setContent",
        // Widgets intentionally contain executable HTML. Capability isolation
        // belongs to the opaque iframe sandbox and CSP above; mutating the
        // payload here breaks full-document styles and interactive controls.
        html: nextHtml,
        runScripts: shouldRunScripts,
      });
    },
    [postToIframe]
  );

  // Build the iframe document once; updates happen via postMessage + morphdom
  const initIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const vars = extractThemeVars();
    const cssVarBlock = buildCssVarBlock(vars);
    const doc = buildCanvasWidgetDocument(cssVarBlock, isDark);

    // srcdoc is cleaner than document.write — no navigation events
    iframe.srcdoc = doc;
  }, [isDark]);

  useEffect(() => {
    initIframe();
  }, [initIframe]);

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }
    writeCssVars();
  }, [writeCssVars]);

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }
    writeContent(normalizedHtml, runScripts);
  }, [normalizedHtml, runScripts, writeContent]);

  // Listen for messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!iframeRef.current) {
        return;
      }
      // Only accept messages from our iframe
      if (e.source !== iframeRef.current.contentWindow) {
        return;
      }

      const { type, text, url, height: h } = e.data ?? {};

      if (type === "avenire:sendMessage" && text && onSendMessage) {
        onSendMessage(text);
      }
      if (type === "avenire:openLink" && url && onOpenLink) {
        onOpenLink(url);
      }
      if (type === "avenire:resize" && typeof h === "number") {
        // Auto-height mode: resize iframe to content
        autoHeightRef.current = Math.max(80, h + 2); // +2 for border
        if (iframeRef.current) {
          iframeRef.current.style.height = `${autoHeightRef.current}px`;
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSendMessage, onOpenLink]);

  return (
    <div
      className={`relative w-full overflow-visible rounded-lg bg-card ${className}`}
      ref={containerRef}
    >
      {isStreaming && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg bg-background/[0.03] backdrop-blur-[0.5px]">
          <div
            className="absolute inset-0 bg-foreground/[0.035]"
            style={{ animation: "widgetPulse 1.6s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes widgetPulse {
              0%, 100% { opacity: 0.18; }
              50% { opacity: 0.42; }
            }
          `}</style>
        </div>
      )}
      <iframe
        onLoad={() => {
          isReadyRef.current = true;
          writeCssVars();
          writeContent(normalizedHtml, runScripts);
        }}
        ref={iframeRef}
        sandbox={CANVAS_WIDGET_SANDBOX}
        style={{
          width: "100%",
          height: `${autoHeightRef.current}px`,
          border: "none",
          display: "block",
          background: "var(--card)",
        }}
        title="Avenire Widget"
      />
    </div>
  );
}
