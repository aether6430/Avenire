"use client";

export function extractThemeVars(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const vars: Record<string, string> = {};
  for (let index = 0; index < style.length; index += 1) {
    const name = style[index];
    if (!name?.startsWith("--")) {
      continue;
    }
    const value = style.getPropertyValue(name).trim();
    if (value) {
      vars[name] = value;
    }
  }
  return vars;
}

export function buildCssVarBlock(vars: Record<string, string>): string {
  const declarations = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
}

export function buildCanvasThemeBlock(isDark: boolean): string {
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
    "--canvas-grid": isDark
      ? "color-mix(in oklch, var(--foreground), transparent 88%)"
      : "color-mix(in oklch, var(--foreground), transparent 92%)",
    "--canvas-grid-strong": isDark
      ? "color-mix(in oklch, var(--foreground), transparent 80%)"
      : "color-mix(in oklch, var(--foreground), transparent 84%)",
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

  const declarations = Object.entries(canvasVars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
}

export const WIDGET_RENDERER_SVG_CLASSES = `
svg { display: block; width: 100%; max-width: 100%; height: auto; overflow: visible; }
svg .t  { font-family: var(--font-sans, sans-serif); font-size: 14px; font-weight: 400; fill: var(--foreground) !important; }
svg .ts { font-family: var(--font-sans, sans-serif); font-size: 12px; font-weight: 400; fill: var(--muted-foreground) !important; }
svg .th { font-family: var(--font-sans, sans-serif); font-size: 14px; font-weight: 500; fill: var(--foreground) !important; }
svg .arr { fill: none !important; stroke: var(--muted-foreground) !important; stroke-width: 1.5px; }
svg .leader { fill: none !important; stroke: var(--muted-foreground) !important; stroke-width: 0.5px; stroke-dasharray: 4 3; }
svg .node { cursor: pointer; }
svg .node:hover { opacity: 0.75; }

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
