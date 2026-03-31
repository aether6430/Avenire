"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WidgetRendererProps {
  /** Raw HTML/CSS/JS fragment from the AI */
  html: string;
  /** Called when the widget calls sendMessage(text) */
  onSendMessage?: (text: string) => void;
  /** Called when the widget calls openLink(url) */
  onOpenLink?: (url: string) => void;
  /** Run inline scripts after content updates (disable during streaming). */
  runScripts?: boolean;
  /** Whether the widget is still streaming (used for shimmer). */
  isStreaming?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// CSS variable extraction
// ---------------------------------------------------------------------------

/**
 * Reads all CSS custom properties from the host document's :root
 * and returns them as a flat object: { "--background": "...", ... }
 */
function extractThemeVars(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const vars: Record<string, string> = {};
  for (let i = 0; i < style.length; i += 1) {
    const name = style[i];
    if (!name?.startsWith("--")) continue;
    const val = style.getPropertyValue(name).trim();
    if (val) vars[name] = val;
  }
  return vars;
}

/**
 * Serializes CSS vars into a :root { ... } block to inject into the iframe.
 */
function buildCssVarBlock(vars: Record<string, string>): string {
  const declarations = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
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
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
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

function buildIframeDocument(cssVarBlock: string, isDark: boolean): string {
  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? "dark" : ""}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
/* ── Base reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  color-scheme: light dark;
}

html, body {
  background: var(--canvas-background, var(--card));
  color: var(--canvas-text, var(--foreground));
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  padding: 12px;
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
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring), transparent 70%) !important;
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
  background: var(--primary) !important;
  color: var(--primary-foreground) !important;
  border: 1px solid color-mix(in oklch, var(--primary), var(--border) 40%) !important;
  cursor: pointer;
  transition: opacity .15s, background .15s, transform .1s;
}
button:active { transform: scale(.97); }
button:disabled { opacity: .6; cursor: not-allowed; }
canvas { display: block; max-width: 100%; }

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
  }
};
window._runScripts = function() {
  var scripts = Array.prototype.slice.call(document.querySelectorAll('#root script'));
  return (async function() {
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
      parent.replaceChild(s, old);

      if (s.src) {
        await new Promise(function(resolve) {
          s.addEventListener('load', resolve, { once: true });
          s.addEventListener('error', resolve, { once: true });
        });
      } else {
        s.textContent = old.textContent;
      }
    }
  })();
};
window._applyCssVars = function(cssText) {
  var style = document.getElementById('avenire-css-vars');
  if (style) style.textContent = cssText;
  window.avenireTheme = window._readTheme();
  window.dispatchEvent(new Event('avenire:themechange'));
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
    primary: rootStyle.getPropertyValue('--canvas-primary').trim() || rootStyle.getPropertyValue('--primary').trim() || '#abcfff',
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
  const h = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'avenire:resize', height: h }, '*');
}

const ro = new ResizeObserver(reportHeight);
ro.observe(document.body);
reportHeight();

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

  const postToIframe = useCallback((data: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
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
        html: nextHtml,
        runScripts: shouldRunScripts,
      });
    },
    [postToIframe]
  );

  // Build the iframe document once; updates happen via postMessage + morphdom
  const initIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const vars = extractThemeVars();
    const cssVarBlock = buildCssVarBlock(vars);
    const doc = buildIframeDocument(cssVarBlock, isDark);

    // srcdoc is cleaner than document.write — no navigation events
    iframe.srcdoc = doc;
  }, [isDark]);

  useEffect(() => {
    initIframe();
  }, [initIframe]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    writeCssVars();
  }, [writeCssVars, isDark]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    writeContent(html, runScripts);
  }, [html, runScripts, writeContent]);

  // Listen for messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!iframeRef.current) return;
      // Only accept messages from our iframe
      if (e.source !== iframeRef.current.contentWindow) return;

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
          iframeRef.current.style.height = autoHeightRef.current + "px";
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSendMessage, onOpenLink]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-visible rounded-lg border border-border bg-card ${className}`}
    >
      {isStreaming && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg bg-background/5 backdrop-blur-[0.5px]">
          <div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
            style={{ animation: "shimmer 2.5s infinite linear" }}
          />
          <style>{`
            @keyframes shimmer {
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Avenire Widget"
        sandbox="allow-scripts"
        onLoad={() => {
          isReadyRef.current = true;
          writeCssVars();
          writeContent(html, runScripts);
        }}
        style={{
          width: "100%",
          height: `${autoHeightRef.current}px`,
          border: "none",
          display: "block",
          background: "var(--card)",
        }}
      />
    </div>
  );
}
