# Plan 005: Sanitize primitive widget HTML without removing the HTML node

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 0333b43..HEAD -- packages/ai/tools/index.ts apps/web/src/components/WidgetPrimitiveRenderer.tsx apps/web/src/components/WidgetPrimitiveRenderer.test.tsx apps/web/package.json pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, tests
- **Planned at**: commit `0333b43`, 2026-06-11

## Why this matters

Primitive widgets are rendered directly in Avenire's first-party DOM. The
widget schema intentionally supports an `html` node, but its value currently
reaches `dangerouslySetInnerHTML` unchanged. A model-generated or persisted
widget can therefore supply scripts, event handlers, unsafe URL schemes, or
active embedded content with the privileges of the Avenire page.

The `html` node is an important presentation primitive and must remain in the
schema. This plan keeps it, sanitizes its payload immediately before rendering,
and adds regression tests for both malicious and useful educational markup.

## Current state

- `packages/ai/tools/index.ts` defines `widgetSpecNodeSchema`; lines 200-203
  accept `{ type: "html", html: string }`.
- `apps/web/src/components/WidgetPrimitiveRenderer.tsx` recursively renders
  primitive widget nodes in the main document.
- `apps/web/package.json` already depends on `dompurify`; do not add a second
  sanitizer library.

Current unsafe render path:

```tsx
// apps/web/src/components/WidgetPrimitiveRenderer.tsx:337
case "html":
  return (
    <div
      className="contents"
      dangerouslySetInnerHTML={{ __html: node.html }}
      key={key}
    />
  );
```

The raw-code `WidgetRenderer` is different: it renders inside an iframe with
`sandbox="allow-scripts"`. Do not route primitive HTML through that iframe;
primitive widgets need to remain composable with stack/grid/card nodes.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Focused tests | `pnpm --filter @avenire/web exec vitest run src/components/WidgetPrimitiveRenderer.test.tsx` | all tests pass |
| Web typecheck | `pnpm --filter @avenire/web check-types` | exit 0 |
| Web tests | `pnpm --filter @avenire/web test` | all tests pass |
| Lint | `pnpm exec biome check apps/web/src/components/WidgetPrimitiveRenderer.tsx apps/web/src/components/WidgetPrimitiveRenderer.test.tsx` | exit 0 |

## Scope

**In scope**:

- `apps/web/src/components/WidgetPrimitiveRenderer.tsx`
- `apps/web/src/components/WidgetPrimitiveRenderer.test.tsx` (create)
- `apps/web/package.json` and `pnpm-lock.yaml` only if DOMPurify typings or a
  version adjustment are actually required

**Out of scope**:

- Removing or renaming the `html` widget node
- Changing `packages/ai/tools/index.ts` schema or widget response contracts
- Replacing `WidgetRenderer` or weakening its iframe sandbox
- Sanitizing trusted JSON-LD, syntax-highlighting output, or Mermaid output in
  unrelated components
- Allowing scripts, forms, iframes, objects, embeds, or inline event handlers

## Git workflow

- Branch: `advisor/005-sanitize-primitive-widget-html`
- Commit message: `fix widget html sanitization`
- Do not push or open a PR unless the operator explicitly requests it.

## Steps

### Step 1: Add one explicit widget HTML sanitizer

In `WidgetPrimitiveRenderer.tsx`, import DOMPurify and add a small exported
helper named `sanitizeWidgetHtml`. It must call DOMPurify with an explicit
policy suitable for untrusted model output.

The policy must:

- preserve useful semantic markup such as headings, paragraphs, lists,
  tables, code/pre, blockquotes, details/summary, emphasis, links, images, and
  sanitized SVG used for educational diagrams;
- remove `script`, `iframe`, `object`, `embed`, `form`, `input`, `button`,
  `textarea`, `select`, `meta`, `link`, `base`, audio, and video elements;
- remove all `on*` event attributes and the `style` attribute;
- preserve benign attributes including `class`, `title`, `aria-*`, table
  structure attributes, SVG geometry attributes, and image dimensions;
- allow link/image URLs only when DOMPurify considers their protocols safe;
  explicitly reject `javascript:`, `vbscript:`, and unsafe `data:` URLs;
- add `rel="noopener noreferrer"` to links with `target="_blank"`.

Keep the policy next to the renderer, not in a generic app-wide sanitizer: it
is a widget security boundary with widget-specific allowed markup.

**Verify**: run the focused test command after Step 2; TypeScript should accept
the DOMPurify import without a new package.

### Step 2: Sanitize at the final render boundary and add tests

Replace `node.html` in the `dangerouslySetInnerHTML` call with
`sanitizeWidgetHtml(node.html)`. Do not sanitize at tool-call creation only:
persisted historical messages and any alternate callers must pass through the
same final boundary.

Create a Happy DOM component test following
`apps/web/src/components/shared/sensitive-text.test.tsx`. Cover at least:

1. `<script>` is removed and never executes.
2. `onerror`, `onclick`, and similar event attributes are removed.
3. `javascript:` links and unsafe embedded URLs are removed.
4. iframe/form/input/object/embed elements are removed.
5. safe headings, lists, tables, code, and sanitized SVG remain visible.
6. `_blank` links receive `noopener noreferrer`.

Assert against the rendered DOM, not only the sanitizer's returned string.

**Verify**: `pnpm --filter @avenire/web exec vitest run src/components/WidgetPrimitiveRenderer.test.tsx` -> all new tests pass.

### Step 3: Run package verification

Run the lint, typecheck, and complete web test commands from the table.

**Verify**: every command exits 0 and existing widget spec rendering remains
type-compatible.

## Test plan

- Use `@vitest-environment happy-dom` and React `createRoot`.
- Include one positive test with nested semantic educational markup.
- Include separate attack strings for active tags, event attributes, and URL
  protocols so a future sanitizer configuration regression identifies the
  exact category that reopened.
- Do not test by executing a real browser alert; assert that executable nodes
  and attributes are absent from the DOM.

## Done criteria

- [ ] The `html` node still exists in `widgetSpecNodeSchema`.
- [ ] Every primitive HTML node passes through `sanitizeWidgetHtml` at render.
- [ ] Scripts, event attributes, active embeds, unsafe URLs, and inline styles
      are removed by tests.
- [ ] Useful semantic HTML and sanitized SVG are preserved by tests.
- [ ] Focused tests, full web tests, web typecheck, and scoped Biome check pass.
- [ ] No files outside the in-scope list are modified.

## STOP conditions

Stop and report instead of improvising if:

- DOMPurify cannot run consistently in both Next.js client rendering and the
  Happy DOM test environment.
- Preserving required widget behavior would require allowing scripts or inline
  event attributes in the first-party DOM.
- The live renderer no longer injects primitive HTML directly.
- The change appears to require weakening the iframe sandbox.

## Maintenance notes

Review any future expansion of the allowed tag or attribute policy as a
security change. Keep sanitization at the final render boundary even if widget
generation later also sanitizes earlier. If interactive arbitrary HTML is
needed, it belongs in the sandboxed raw-code widget path, not this primitive.
