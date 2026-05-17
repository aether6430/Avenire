"use client";

import {
  buildCanvasThemeBlock,
  WIDGET_RENDERER_SVG_CLASSES,
} from "@/components/widget-renderer-theme";

export function buildIframeDocument(
  cssVarBlock: string,
  isDark: boolean
): string {
  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? "dark" : ""}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
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

${WIDGET_RENDERER_SVG_CLASSES}

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
window.sendMessage = function(text) {
  window.parent.postMessage({ type: 'avenire:sendMessage', text }, '*');
};
window.sendPrompt = function(text) {
  window.sendMessage(text);
};
window.openLink = function(url) {
  window.parent.postMessage({ type: 'avenire:openLink', url }, '*');
};

window._morphReady = false;
window._pending = null;
window._waitForLayout = async function() {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {
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
