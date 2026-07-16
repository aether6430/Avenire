export type PlanStatus = "proposed" | "approved" | "in-progress" | "complete"

export type PlanSectionKind =
  | "decision"
  | "scope"
  | "implementation"
  | "impact"
  | "risk"
  | "validation"

export interface PlanSection {
  id: string
  title: string
  kind: PlanSectionKind
  body: string
  order: number
}

export interface PlanDocument {
  id: string
  title: string
  summary: string
  audience: string
  owner: string
  date: string
  status: PlanStatus
  sections: PlanSection[]
}

export const codebaseRefactorPlan: PlanDocument = {
  id: "avenire-codebase-refactor-2026-07",
  title: "Avenire Codebase Refactor Plan",
  summary:
    "An evidence-led refactor that restores deployability, closes student-file trust gaps, removes retrieval's timeout-shaped latency, moves credits to Polar's native meter model, and steadily replaces duplicated API plumbing with typed Effect boundaries.",
  audience: "Avenire engineering and product owners",
  owner: "Avenire engineering",
  date: "2026-07-10",
  status: "proposed",
  sections: [
    {
      id: "decision-order",
      title: "Decision and dependency order",
      kind: "decision",
      order: 1,
      body:
        "Restore the known-good TypeScript toolchain before changing runtime behavior. Define the shared file contract before enforcing upload admission against it. Measure retrieval before and after removing the Redis stall. Establish billing invariants before cutting over to Polar. Migrate APIs by domain rather than in one repository-wide flag day. Finish with React and dead-code passes against stable contracts.",
    },
    {
      id: "current-evidence",
      title: "Current evidence",
      kind: "scope",
      order: 2,
      body:
        "The repository has 109 route.ts files, 44 direct request or req JSON readers, and no direct Effect imports in route modules. Redis uses connectTimeout=10,000ms and awaited connection; this strongly correlates with the reported delay but is not proven as the production cause until stage timings are captured. Expansion precedes HyDE serially, slow escalation repeats base embedding and search, and cache fingerprints aggregate ordered full-corpus content. Billing persists usage_meter and implements consumption and refund locally with no native Polar meter ingestion. File IDs remain strings and wildcard MIME values can be persisted. Large surfaces include explorer at 8,101 lines, editor at 4,184, command palette at 3,056, sidebar at 2,947, chat route at 2,708, and multimodal input at 1,701. React Doctor 39 with 844 diagnostics, including 51 errors and 793 warnings across 158 files, is a prior snapshot that must be rerun before work starts.",
    },
    {
      id: "typescript-rollback",
      title: "Milestone 0 - Close PR45 and restore Next.js compatibility",
      kind: "implementation",
      order: 3,
      body:
        "Close the unmerged PR45 branch with a compatibility note: Next.js 16.2.6 still loads typescript/lib/typescript.js during build setup even when ignoreBuildErrors is enabled, while TypeScript 7 no longer ships that path. Roll the PR branch back to TypeScript 5.9.3, remove the ignoreBuildErrors workaround, restore test-file type inclusion, refresh the lockfile, and rerun the exact CI build. This is not a revert on main because the upgrade was not merged. Do not patch Next.js or retain a silent type-check bypass. Revisit TypeScript 7 only after upstream Next.js support is documented and the same branch passes locally and in CI.",
    },
    {
      id: "file-contract",
      title: "Milestone 1 - Opaque identifiers, MIME policy, and tagged errors",
      kind: "implementation",
      order: 4,
      body:
        "Create one student-file contract shared by routes, database adapters, upload runtime, and ingestion. Brand WorkspaceId, StudentFileId, UploadSessionId, and StorageKey so they cannot be interchanged. Decode external values with Effect Schema at the boundary. Replace duplicated MIME lists and wildcard persistence with one canonical policy based on declared type, extension, and detected signature; persist only normalized concrete MIME values. Replace isRecord-style parsing, asserted request bodies, and string error codes with tagged errors mapped once to stable HTTP responses. Schema validators cover identifiers, metadata, extensions, part order and size, duplicate completion, and cross-workspace substitution. Bounded content inspection and quarantine separately handle signature mismatch, archives, decompression risk, and oversized decoded dimensions; schema validation alone cannot prove binary safety.",
    },
    {
      id: "student-files",
      title: "Milestone 2 - Student file capability and multipart security",
      kind: "implementation",
      order: 5,
      body:
        "Make the upload session the sole capability that can register a stored student file. Bind workspace, owner, object key, expected size, canonical MIME, checksum, and expiry to the session on the server. Stop accepting caller-selected storage keys or final URLs. Enforce aggregate multipart size and part-count ceilings before provider writes, verify contiguous parts and checksums, make completion idempotent, and delete abandoned parts. Registration consumes the capability once and returns only the opaque file identifier and safe metadata.",
    },
    {
      id: "retrieval",
      title: "Milestone 3 - Retrieval latency and cancellation",
      kind: "implementation",
      order: 6,
      body:
        "Instrument phase timings before changing the pipeline because the Redis timeout is a strong correlation, not yet proven production causality. Remove Redis connection establishment from the required search path, reduce its 10-second timeout to a short bounded attempt, and add failure cooldown so an unavailable cache is not retried per request. Start independent query expansion and HyDE work together with Promise.all, propagate one AbortSignal, and cancel unused branches. Reuse the initial embedding and fast hybrid candidates instead of repeating them in the slow path. Replace the O(corpus) full-content fingerprint with an indexed workspace ingestion revision lookup. Parallelize only independent work; do not duplicate embedding, database, or reranker calls to hide latency.",
    },
    {
      id: "polar",
      title: "Milestone 4 - Polar native credits",
      kind: "implementation",
      order: 7,
      body:
        "Configure Polar meters and credit benefits as the commercial source of truth. Keep an atomic local admission reservation because Polar does not block usage at zero balance. Record each accepted usage event in a transactional outbox with a stable idempotency key, send it to Polar asynchronously, and reconcile customer meter balances. Define grant, refund, retry, outage, subscription-cycle, and account-transfer semantics before cutover. Shadow-report local and Polar balances, stop on material divergence, then replace the current refill ledger with minimal reservation, outbox, and reconciliation state. Delete only the refill, debit, restore, and entitlement calculations Polar actually replaces. Confirm the installed SDK and external Polar dashboard configuration before implementation.",
    },
    {
      id: "effect-api",
      title: "Milestone 5 - Staged Effect v4 API migration",
      kind: "implementation",
      order: 8,
      body:
        "Establish one request runner for schema decoding, authentication context, service layers, tagged errors, cancellation, logging, and HTTP serialization. Migrate complete route domains in order: upload and files, retrieval, billing/webhooks, workspace data, AI generation, then remaining utility routes. Each migrated domain removes its legacy parsers and response helpers in the same change. Keep Next.js route modules thin and keep provider SDK concerns inside services. Do not wrap existing try/catch blocks in Effect; replace them with typed operations and delete the old branches.",
    },
    {
      id: "react-doctor",
      title: "Milestone 6 - React Doctor 39 to 80+",
      kind: "implementation",
      order: 9,
      body:
        "Rerun the canonical full-app report; the 39 score and 844 diagnostics are a prior baseline snapshot, not a current guarantee. Classify real defects separately from accepted patterns. Fix rules-of-hooks and missing cleanup first. Move event-driven state changes into handlers, pure transforms into render or useMemo, and external subscriptions, timers, DOM integrations, and fetch lifecycles into focused effects with cleanup. Split explorer, chat input, sidebar, and other giant components along ownership boundaries. Remove unused dependencies and exports only after reference verification. Record intentional diagnostics rather than gaming the score. Stop at 80+ only when typecheck, build, interaction checks, and effect-lifecycle review remain clean.",
    },
    {
      id: "dead-code",
      title: "Milestone 7 - Dead code and monolith reduction",
      kind: "implementation",
      order: 10,
      body:
        "Delete replaced upload, billing, retrieval, API, and React helpers as each domain lands. Use import/reference evidence and production telemetry before removing code. Break monoliths by stable responsibility, not arbitrary line count: orchestration, domain model, external adapter, persistence, and view state. Remove isRecord clones, defensive casts, duplicate MIME tables, local meter refill logic, repeated response mapping, unused exports, and compatibility shims whose callers are gone. Avoid parallel old/new abstractions after cutover.",
    },
    {
      id: "impact",
      title: "Estimated codebase impact",
      kind: "impact",
      order: 11,
      body:
        "All numerical ranges are low-confidence planning targets derived from the audited duplicate surfaces and must be re-estimated after decomposition and baseline telemetry. Across the full program, target roughly 2,000-3,500 added lines and 4,500-7,500 deleted lines, for a net reduction of 2,000-4,000 lines. File and API contracts should replace scattered validation with one readable boundary. Polar should remove 300-500 net lines after cutover while retaining minimal reservation and delivery state. Effect route migration should remove 600-1,200 net lines of parsing and response plumbing. React and dead-code work should remove 700-1,500 net lines while making component ownership visible. Retrieval target hypotheses are p50 1.5-3.5 seconds and p95 3-6 seconds from the reported path, with Redis-outage penalty below one second. Cache validation changes from O(corpus) content aggregation to an indexed revision lookup. Billing admission must not add a Polar network call to the chat hot path.",
    },
    {
      id: "validation",
      title: "Validation and release gates",
      kind: "validation",
      order: 12,
      body:
        "Use existing tests as the baseline, but do not claim risky billing or upload changes are safe without missing adversarial and concurrency coverage. This conflicts with the no-new-tests direction: approve the minimum abuse and concurrency characterization suite before implementation, or explicitly accept residual risk and execute a documented manual staging matrix for every case. Required gates are frozen-lockfile install, package typechecks, Next production build, existing suites, upload abuse checks, retrieval traces with Redis healthy and unavailable, concurrent credit admission, Polar outbox retry and reconciliation, route contract snapshots, and a fresh React Doctor scan. Release each domain behind a measurable canary or shadow mode where practical.",
    },
    {
      id: "stops",
      title: "Stop conditions",
      kind: "risk",
      order: 13,
      body:
        "Stop the TypeScript rollback if the clean TS5 branch still fails the same build, then isolate the independent Next worker failure. Stop file cutover on any cross-workspace access, non-idempotent completion, or provider cleanup leak. Stop retrieval rollout if recall or citation quality regresses beyond the agreed evaluation tolerance. Stop Polar cutover on unexplained balance divergence, non-idempotent usage, or admission requiring synchronous Polar availability. Stop an Effect domain migration if it adds a second permanent API framework or increases untyped escape hatches. Stop React cleanup if user workflows regress even when the score rises.",
    },
  ],
}

export const orderedSections = (document: PlanDocument): PlanSection[] =>
  [...document.sections].sort((left, right) => left.order - right.order)
