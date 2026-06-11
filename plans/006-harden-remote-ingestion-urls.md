# Plan 006: Harden remote ingestion against SSRF and unsafe redirects

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 0333b43..HEAD -- packages/ingestion/src/utils/safety.ts packages/ingestion/src/ingestion/link.ts packages/ingestion/src/ingestion/provider-extractors.ts packages/ingestion/src/ingestion/video.ts packages/ingestion/src/ingestion/pipeline.ts packages/ingestion/src/ingestion/image.ts packages/ingestion/src/ingestion/audio.ts packages/ingestion/src/ingestion/ocr.ts packages/ingestion/package.json pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none
- **Category**: security, ingestion, tests
- **Planned at**: commit `0333b43`, 2026-06-11

## Why this matters

Ingestion accepts user-controlled URLs and performs server-side HTTP requests
and ffmpeg reads. The current synchronous URL check blocks literal private IPs
and localhost names, but it does not validate DNS answers, redirect targets,
or media URLs returned by social-provider metadata. A public-looking URL can
therefore resolve or redirect to loopback, link-local, cloud metadata, or an
internal service.

This plan establishes one shared remote-fetch boundary for ingestion. It must
validate addresses at connection time, revalidate every redirect, and validate
provider-derived media URLs before they reach ffmpeg.

## Current state

- `packages/ingestion/src/utils/safety.ts` contains `assertSafeUrl`, which only
  checks protocol, literal localhost, and literal private IPv4/IPv6 hosts.
- `packages/ingestion/src/ingestion/link.ts:59-72` uses normal `fetch`, which
  follows redirects automatically.
- `packages/ingestion/src/ingestion/provider-extractors.ts` fetches provider
  pages/API responses and returns unvalidated `mediaUrls`.
- `packages/ingestion/src/ingestion/video.ts:507-534` resolves a provider media
  URL and sends it to ffmpeg helpers without revalidation.
- `apps/web/src/lib/video-optimization-runtime.ts:95-137` is an existing DNS
  validation example, but it is not sufficient by itself because validation
  and connection use separate DNS resolutions.
- The root lockfile already contains `undici`, but ingestion does not declare it
  directly. Add it to `packages/ingestion/package.json` if its dispatcher API
  is used.

Current incomplete check:

```ts
// packages/ingestion/src/utils/safety.ts:42
const host = parsed.hostname.toLowerCase();
if (host === "localhost" || host.endsWith(".localhost")) {
  throw new Error("Localhost URLs are not allowed for ingestion.");
}

const ipType = isIP(host);
if (ipType === 4 && isPrivateIpv4Host(host)) {
  throw new Error("Private IPv4 URLs are not allowed for ingestion.");
}
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Focused tests | `pnpm --filter @avenire/ingestion exec vitest run src/utils/safety.test.ts src/ingestion/provider-extractors.test.ts src/ingestion/video.test.ts` | all tests pass |
| Typecheck | `pnpm --filter @avenire/ingestion check-types` | exit 0 |
| Package tests | `pnpm --filter @avenire/ingestion test` | all tests pass |
| Audit | `pnpm audit --prod --audit-level high` | no new high findings introduced by the chosen HTTP dependency |

## Scope

**In scope**:

- `packages/ingestion/src/utils/safety.ts`
- `packages/ingestion/src/utils/safety.test.ts` (create)
- All ingestion HTTP callers that retrieve user-selected remote content
- Provider media URL normalization and validation
- Video URLs passed to ffmpeg/ffprobe helpers
- `packages/ingestion/package.json` and `pnpm-lock.yaml` if a direct Undici
  dependency is needed

**Out of scope**:

- Provider API calls to fixed compile-time origins such as Mistral or Cohere
- Browser-side fetches
- A deployment-wide outbound proxy or firewall project
- Changing extraction output shapes or supported provider list
- Treating hostname allowlists as the only defense for arbitrary web links

## Git workflow

- Branch: `advisor/006-harden-remote-ingestion-urls`
- Commit message: `fix remote ingestion url safety`
- Do not push or open a PR unless explicitly requested.

## Steps

### Step 1: Define the complete private-address policy

Refactor `safety.ts` so literal and resolved addresses share one exported
predicate. Cover IPv4 private, loopback, link-local, unspecified, carrier-grade
NAT, multicast, and reserved ranges. Cover IPv6 loopback, unspecified,
link-local, unique-local, multicast, and IPv4-mapped IPv6 addresses.

Keep `assertSafeUrl` for synchronous syntax/protocol checks, but add an async
remote URL path that resolves hostnames and rejects any private/reserved answer.
Do not use a single preflight DNS lookup as the final defense.

**Verify**: focused safety tests cover public and blocked literal/resolved
addresses, including `::ffff:127.0.0.1`.

### Step 2: Add a connection-time safe fetch helper

Implement a shared helper such as `safeRemoteFetch` in `safety.ts` or a tightly
scoped adjacent module. Use Undici's dispatcher/agent connection hook so the
address actually selected for the socket is checked before connection. This
closes the DNS-rebinding gap between validation and fetch.

Requirements:

- only HTTP and HTTPS;
- redirects handled manually with a small fixed limit (maximum 5);
- every redirect target passes syntax, DNS, and connection-time validation;
- relative `Location` headers resolve against the current URL;
- redirect loops, missing locations, credential-bearing URLs, and downgrade to
  unsupported protocols fail closed;
- caller-provided timeout/abort signals and headers remain supported;
- error messages identify the safety class without leaking credentials.

Do not globally replace `fetch`; callers must opt into this boundary.

**Verify**: mock DNS/dispatcher behavior and redirect responses in
`safety.test.ts`. Include a public URL redirecting to `127.0.0.1` and a hostname
whose selected connection address is private.

### Step 3: Route user-controlled ingestion fetches through the helper

Replace direct remote-content fetches in `link.ts`, provider page/API fetches
derived from user URLs, and pipeline storage/link fetches where the destination
is not a fixed provider API origin. Preserve existing headers, retries, timeout
behavior, response checks, and size limits.

Fixed-origin provider requests may remain normal fetches only when every part
of the origin is compile-time controlled and user data is confined to query or
path parameters that cannot alter the host.

**Verify**: existing ingestion tests pass and new redirect tests demonstrate
that no caller silently follows an unsafe redirect.

### Step 4: Validate provider-derived media before ffmpeg

Normalize every `ProviderExtracted.mediaUrls` value through the same URL safety
policy. Invalid values should be dropped from extraction results rather than
stored as trusted media candidates. In `video.ts`, validate the final
`sourceForFfmpeg` again after provider resolution and before any ffmpeg or
ffprobe helper receives it.

The second check is mandatory even if provider extractors sanitize their
output; it is the final boundary protecting command-line media readers.

**Verify**: extend `provider-extractors.test.ts` and `video.test.ts` so a
provider response containing a loopback/private media URL never reaches an
ffmpeg mock, while a public media URL still does.

### Step 5: Run package and dependency verification

Run focused tests, ingestion typecheck, full ingestion tests, and production
dependency audit. Inspect the diff for any remaining direct `fetch` whose URL
comes from user input or provider metadata.

**Verify**: all commands exit 0; any remaining direct fetch is documented in
the PR as fixed-origin and not user-host-controlled.

## Test plan

- Literal IPv4 and IPv6 blocked/public cases.
- DNS resolving to private, mixed public/private, and public-only answers.
- IPv4-mapped IPv6 private addresses.
- Safe public redirect and unsafe private redirect.
- Redirect limit and loop behavior.
- Provider media results containing private and malformed URLs.
- Final video media source revalidation before ffmpeg.
- Existing public `172.200.x.x` regression remains allowed.

## Done criteria

- [ ] All user-controlled remote ingestion HTTP connections validate the
      actual selected socket address.
- [ ] Redirects are manual, bounded, and revalidated at every hop.
- [ ] Provider-derived media URLs are filtered and final ffmpeg URLs are
      revalidated.
- [ ] No supported public URL regression is introduced in focused tests.
- [ ] Ingestion typecheck/tests and production dependency audit pass.

## STOP conditions

Stop and report instead of weakening the design if:

- The chosen HTTP client cannot enforce address checks at connection time.
- Supporting the deployment runtime requires bypassing DNS validation.
- A provider requires redirects to a private or link-local destination.
- ffmpeg performs an additional unresolved redirect chain that cannot be
  constrained by the application. In that case propose downloading through
  the safe HTTP helper to a bounded temporary file instead.

## Maintenance notes

SSRF policy belongs in one ingestion utility. New extractors must not add raw
`fetch(userUrl)` calls. Reviewers should treat changes to private-address
ranges, redirect handling, dispatcher behavior, or ffmpeg URL use as security
changes. Network egress controls remain a valuable defense in depth even after
this application-layer fix.
