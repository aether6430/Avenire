# Visual Interaction Audit Current

Tags: audit, visual, interaction, workspace, auth

## Scope

This is the current visual and interaction audit artifact for the active
no-sync repo.

It does not claim a full design review. It records the strongest current
browser-visible evidence for the surfaces that were actually inspected.

## Evidence used

Public/auth-entry evidence already recorded in
`docs/product-coherence-audit-current.md`:

- `/`
- `/pricing`
- `/login`
- unauthenticated `/workspace` redirect

Signed-in browser evidence from the current local auth pass:

- waitlist-approved local user: `audit.browser@example.com`
- authenticated cookie jar from local sign-up + verify-email
- session proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies.txt --upstream http://127.0.0.1:3000 --port 4010`
- browser render captures from:
  - `chrome-headless-shell`
  - full Chrome headless
- signed-in route inspected:
  - `http://localhost:4010/workspace`

Direct production browser evidence:

- local production server at:
  - `http://127.0.0.1:3005`
- Playwright-driven signed-in route:
  - `http://127.0.0.1:3005/workspace`
- direct production sign-in cookie established through:
  - `POST /api/auth/sign-in/email`

## Observed strengths

### 1. Public-facing surfaces still read like one product

From the existing product audit:

- marketing navigation is consistent across home and pricing
- pricing language matches the same study/research product identity
- login remains visually calm and structurally compact

That matters because the product edge still feels intentionally designed rather
than stitched together from unrelated screens.

### 2. The signed-in workspace shell has a coherent visual frame

Observed in both authenticated browser captures:

- left sidebar chrome rendered consistently
- top-left workspace title and collapse control were visible
- the section rail under the title rendered as a single grouped control
- `Workspace Home`, `New Method`, `Open Mindset Sets`, `Open Files`, and
  `Open Tasks` appeared in one navigation cluster
- footer utilities remained visually aligned with the rest of the sidebar

The shell reads as one integrated workspace surface rather than a stack of
independent widgets.

### 3. The shell styling is restrained and consistent

Observed in the signed-in shell capture:

- neutral background
- quiet borders
- compact iconography
- spacing rhythm consistent between header, tab rail, navigation items, and
  footer tools

This supports the “quiet work surface” direction without feeling like a
marketing page leaked into the product.

## Current weak spot

### 1. The main signed-in pane is still visually unresolved

In both authenticated browser captures, the main pane remained on:

- `Loading workspace...`

even after a `20s` virtual-time budget.

That means the shell is visually coherent, but the central work surface is not
yet visually proven in a healthy ready state.

### 2. The production signed-in route is visually worse than the shell-only dev pass

Observed in the direct production browser session:

- the route stayed on signed-in `/workspace`
- the main pane still showed `Loading workspace...`
- after the later production crash, the browser degraded to a full connection
  failure surface instead of a product UI

So the best current visual story is still the authenticated shell, not a stable
ready-state main workspace view.

## Conclusion

The visual story is materially better than it was when the large shell files
were still giant inline surfaces:

- public entry surfaces are aligned
- auth entry remains visually calm
- the signed-in workspace shell is now browser-visible and coherent

But the audit is still incomplete because the primary work pane has not yet
been observed in a stable ready state under either the authenticated dev-proxy
or the direct production browser pass.
