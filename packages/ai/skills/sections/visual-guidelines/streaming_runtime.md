## Streaming and runtime

- Stream useful structure early: short `<style>` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and `document.getElementById(...)`; never use `document.currentScript` to find the root.
- For CDN scripts, use a named initializer with `onload="initChart()"`; add `if (window.Chart) initChart()` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use `fetch`, XHR, WebSocket, or other API calls.
- No nested scrolling and no `position: fixed`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from `cdnjs.cloudflare.com`, `esm.sh`, `cdn.jsdelivr.net`, and `unpkg.com`. `connect-src` is `none`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque `allow-scripts` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.
