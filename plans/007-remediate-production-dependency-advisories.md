# Plan 007: Remediate high-severity production dependency advisories

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 0333b43..HEAD -- package.json apps/web/package.json packages/ingestion/package.json packages/storage/package.json packages/storage/index.ts packages/storage/client.ts packages/storage/ssr.ts pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, dependencies, tests
- **Planned at**: commit `0333b43`, 2026-06-11

## Why this matters

`pnpm audit --prod --audit-level high` currently reports seven high-severity
advisories. Six resolve to `axios@1.15.2` through `@tavily/core`; one resolves
to `tmp@0.2.5` through `files-sdk@1.2.0 -> @netlify/blobs -> tmp-promise`.
These are production dependency paths, not development-only tooling.

Current registry metadata checked on 2026-06-11 shows
`@tavily/core@0.7.6`, `files-sdk@1.8.0`, and `@netlify/blobs@10.7.9` as current.
The Tavily package still declares a broad Axios range, while Avenire's root
override pins Axios to the vulnerable `1.15.2`. The current `files-sdk@1.8.0`
metadata no longer lists the Netlify dependency chain.

## Current state

- `package.json` has `pnpm.overrides.axios = "1.15.2"`.
- `apps/web/package.json` and `packages/ingestion/package.json` depend on
  `@tavily/core@^0.7.3`.
- `packages/storage/package.json` depends on `files-sdk@^1.2.0`.
- `packages/storage/index.ts` uses `Files`, `uploadthing`, `Body`, and
  `UploadOptions` from `files-sdk`.
- The lockfile resolves `@tavily/core@0.7.3`, `axios@1.15.2`,
  `files-sdk@1.2.0`, `@netlify/blobs@10.7.5`, and `tmp@0.2.5`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Update | `pnpm update @tavily/core@^0.7.6 --filter @avenire/web --filter @avenire/ingestion` | exit 0 |
| Storage update | `pnpm --filter @avenire/storage add files-sdk@^1.8.0` | exit 0 |
| Audit | `pnpm audit --prod --audit-level high` | no high Axios or tmp findings |
| Typecheck | `pnpm check-types` | exit 0 |
| Tests | `pnpm test` | all tests pass |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope**:

- Root Axios override
- Direct Tavily and files-sdk dependency ranges
- Lockfile changes caused by those upgrades
- Minimal storage adapter changes required by the files-sdk upgrade
- Existing tests affected by API/type changes

**Out of scope**:

- Broad latest-version upgrades
- Suppressing advisories without removing the vulnerable resolution
- Replacing Tavily or the storage abstraction unless the supported upgrades
  cannot remove the vulnerable paths
- Unrelated moderate/low audit findings

## Git workflow

- Branch: `advisor/007-remediate-production-dependency-advisories`
- Commit message: `fix production dependency advisories`
- Do not push or open a PR unless explicitly requested.

## Steps

### Step 1: Remove the vulnerable Axios override

Change the root `pnpm.overrides.axios` entry from `1.15.2` to the minimum
patched release reported by the advisory (`1.16.0`) or a newer compatible
1.x release. Do not remove the override without confirming the lockfile cannot
select an older vulnerable version through Tavily.

Update both direct `@tavily/core` ranges to at least `^0.7.6`, regenerate the
lockfile, and confirm the installed Axios version is patched.

**Verify**:
`pnpm why axios && pnpm list axios -r` -> every production path resolves Axios
`>=1.16.0`.

### Step 2: Upgrade files-sdk and verify its adapter API

Upgrade `packages/storage` to `files-sdk@^1.8.0`. Read the installed package's
exports and types before changing Avenire code. Preserve the public exports of
`@avenire/storage` and the UploadThing adapter behavior.

If the current imports still compile, make no cosmetic storage rewrite. If the
API changed, adapt only `packages/storage/index.ts`, `client.ts`, and `ssr.ts`
as required and add a focused test for any behavior-bearing adaptation.

**Verify**:
`pnpm why tmp && pnpm why @netlify/blobs` -> neither vulnerable production path
is reachable from `@avenire/storage`, or the resolved `tmp` is `>=0.2.6`.

### Step 3: Run the security audit and inspect residual findings

Run the production audit. Confirm that all seven high findings identified by
this plan are gone. Record any unrelated remaining high advisory separately;
do not claim success by filtering output.

**Verify**: `pnpm audit --prod --audit-level high` exits 0, or has zero high
findings and only package-manager exit behavior explicitly documented.

### Step 4: Run full compatibility verification

Run repo typechecks, tests, and build. Exercise at least one mocked Tavily path
and the existing storage upload path through their current tests or a focused
smoke test.

**Verify**: `pnpm check-types`, `pnpm test`, and `pnpm build` all exit 0.

## Test plan

- Existing chat-tool utility tests continue to mock/use `@tavily/core`.
- Existing provider extraction/link ingestion tests pass with the Tavily
  upgrade.
- Storage package typecheck confirms `Files`, adapter, and exported types.
- Add a storage behavior test only if files-sdk API adaptation is necessary.
- Audit assertions use `pnpm why` and the actual lockfile, not package.json
  ranges alone.

## Done criteria

- [ ] No production dependency resolves `axios <1.16.0`.
- [ ] The vulnerable `tmp <0.2.6` storage path is removed or patched.
- [ ] The seven known high advisories no longer appear.
- [ ] Tavily and storage behavior remain compatible.
- [ ] Full typecheck, test, and build commands pass.
- [ ] Lockfile changes are limited to the intended dependency graph.

## STOP conditions

Stop and report instead of forcing an override if:

- `@tavily/core` is incompatible with patched Axios 1.x.
- `files-sdk@1.8.x` removed or materially changed the UploadThing adapter in a
  way that changes Avenire's storage contract.
- Removing the tmp path requires replacing the storage provider.
- The audit identifies a new high advisory introduced by the proposed upgrade.

## Maintenance notes

Keep dependency overrides documented and as narrow as possible. Add the
production audit to a scheduled or CI workflow after this remediation if its
registry availability and runtime are acceptable. Future wrapper upgrades
must still be checked with `pnpm why`; a safe direct range does not guarantee a
safe lockfile resolution.
