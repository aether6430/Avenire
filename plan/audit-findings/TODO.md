# Audit findings: remaining work

Updated: 2026-07-12

This list records only work that is still pending after the Effect API-boundary
migration and retrieval-performance pass. Completed implementation is noted so
the remaining validation work is not confused with missing code.

## Effect boundary adoption

Completed in this branch:

- All JSON API request bodies are decoded through the shared Effect runner.
- Route-level `request.json()` calls, asserted bodies, and Unknown-to-Zod
  request validation have been removed.
- The runner has tagged parse, payload, and cancellation errors; redacted public
  serialization; AbortSignal propagation; request metadata; and tracing spans.
- Positive and negative runner tests, upload schema tests, and a repository-wide
  boundary regression scanner are in place.

Pending:

- [ ] Introduce typed Effect `Context` services and `Layer`s for authentication,
  workspace access, database access, and provider clients.
- [ ] Add a general domain-handler runner with uniform success/error response
  schemas and status mapping, then migrate route-local error mappers.
- [ ] Model provider failures as tagged domain errors and verify provider details
  are redacted across every migrated domain.
- [ ] Add end-to-end duration/completion logging through the existing API logger.
- [ ] Add domain contract snapshots for status codes, public error tags,
  cancellation, and redaction.
- [ ] Add positive and negative schema tests for schemas not yet directly covered.
- [ ] Record before/after p50 and p95 latency for representative migrated routes.
- [ ] Delete legacy runner/error helpers only after all domain services use the
  replacement contracts.

## Retrieval performance

Completed in this branch:

- Redis cache probes have a short request-path budget and retrieval continues
  when Redis is slow or unavailable; the existing circuit breaker and recovery
  probe remain covered.
- Query expansion and HyDE run concurrently.
- Original, expanded, and HyDE texts share one embedding request, with a
  call-count regression test.
- Fast-path embeddings and candidates are reused by adaptive retrieval.
- Workspace corpus validation now uses an ingestion revision instead of an
  O(corpus) ordered content fingerprint.
- Retrieval and request-level phase timings are emitted.

Pending:

- [ ] Deploy migration `0022_workspace_ingestion_revision.sql` before deploying
  application code that reads the new revision column.
- [ ] Capture healthy, 3-second-latency, and unavailable-Redis traces and compare
  p50/p95 latency, recall, citation quality, provider call counts, and cache hits.
- [ ] Confirm production phase timings show expansion plus HyDE approaching the
  slower branch duration rather than the sum of both branches.
- [ ] Measure cache hit/miss ratio before and after revision invalidation and
  verify there are no stale false hits during real ingestion traffic.
- [ ] Add an operational dashboard/alert for Redis bypasses, circuit state,
  retrieval phase p95, cache hit ratio, and provider call counts.
- [ ] Decide whether phase timing logs need sampling after observing production
  volume and logging cost.

## Credit and billing

- [ ] Prove atomic credit admission with the planned PostgreSQL stress test: 50
  simultaneous requests against 25 credits must admit at most 25.
- [ ] Complete the Polar credit-ledger migration and reconciliation tooling.
- [ ] Inject local/Polar divergence and verify reconciliation alerts.
- [ ] Run old and new billing paths in shadow mode and compare balances daily for
  one week before cutover.
- [ ] Verify renewal and refund parity and zero Polar network calls on the chat
  admission hot path.
- [ ] Remove duplicated refill scheduling, debit/refund, and entitlement logic
  only after the shadow-mode exit criteria pass.

## Upload security and MIME policy

- [ ] Consolidate the server and client MIME allowlists into one exact policy;
  reject wildcards and add magic-byte verification.
- [ ] Bind every write and completion request to one opaque, expiring upload
  capability and enforce workspace ownership.
- [ ] Enforce cumulative bytes and part counts before multipart assembly.
- [ ] Make completion idempotent and consume the capability in the same
  transaction that registers the file.
- [ ] Remove caller-selected storage keys/URLs and return only opaque file
  identity plus safe metadata.
- [ ] Sweep abandoned parts and failed provider objects within a documented TTL.
- [ ] Add ownership-substitution, aggregate-exhaustion, replay, duplicate
  completion, checksum, MIME-spoofing, cleanup, and cross-workspace tests.
- [ ] Benchmark and document per-part validation overhead.

## TypeScript 7 recovery

- [ ] Confirm frozen-lockfile install succeeds without warnings in clean CI.
- [ ] Run every existing package test suite, not only affected-package tests.
- [ ] Verify a production deployment preview renders correctly.
- [ ] Confirm non-Next packages continue to compile and test under TypeScript 7.
- [ ] Close the superseded TypeScript recovery PR when branch/PR ownership is
  confirmed.

## React health

The canonical React Doctor score is 100/100 per the completed user-run scan.

- [ ] Run the production build and interaction checks for chat, uploads, editor,
  and sidebar navigation on the final integrated branch.
- [ ] Capture render-count profiles for converted components where the audit
  requested before/after evidence.
- [ ] Verify extracted monolith components remain independently tested and do not
  gain unexpected sibling imports.
- [ ] Verify removed exports through production telemetry or import tracing.

## Final integration gates

- [ ] Run the full workspace typecheck without a timeout/resource interruption.
- [ ] Run the full workspace test suite and production build.
- [ ] Resolve or formally rebaseline the existing misconception-improvement test
  whose expected generic validation message differs from the current specific
  response.
- [ ] Run clean-install CI and deployment-preview validation.
- [ ] Review production telemetry after deployment before declaring the audit
  fully closed.
