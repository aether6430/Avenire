# Local Workspace Integrity

When this repository lives inside an iCloud-managed path such as `Desktop` or
`Documents`, macOS can leave files as `dataless` placeholders instead of fully
materialized local content. In practice, that can make ordinary engineering
work look randomly broken:

- `cat`, `sed`, `head`, or other simple reads can hang
- `tsc`, `biome`, or other verifiers can stall in filesystem reads
- one area of the repo may behave normally while another silently blocks

This is a local workspace integrity problem first, not an application bug.

## Fast check

Run:

```bash
pnpm doctor:dataless
```

What it does:

- scans the main repo surfaces for files marked `dataless`
- prints a grouped summary by app/package area by default
- prints only a small sample path list instead of flooding the terminal
- warns explicitly when the repo itself lives under a sync-prone path such as
  `~/Desktop` or `~/Documents`

If the command exits with `1`, do not trust follow-up verifier hangs at face
value until the placeholders are resolved.

## Bounded materialization attempt

If you want to try a small, time-bounded local warm-up of placeholder files,
run:

```bash
pnpm doctor:dataless:materialize
```

That helper:

- targets only a limited number of files by default
- uses a short per-file timeout
- reports how many files actually materialized versus how many stayed
  placeholders

Useful variants:

```bash
pnpm doctor:dataless:materialize -- --limit 5 apps/web
pnpm doctor:dataless:materialize -- --dry-run --all .
```

## Typical symptoms

You are likely dealing with placeholder files when:

- a small `README.md` or `.tsx` file hangs on read
- one verifier pass succeeds, then a nearby one stalls with no surfaced error
- process samples show filesystem `read(...)` loops instead of a clear compile
  error

## Recommended remediation

1. Move the repo to a non-synced local development path if possible.

   Good examples:

   ```text
   ~/Code/avenire
   /Users/<you>/Code/avenire
   ```

   Less reliable examples for active dev work:

   ```text
   ~/Desktop/avenire
   ~/Documents/avenire
   ```

2. Materialize the affected files locally before trusting verifier output.

   In Finder, use the equivalent of “Download Now” on the repo or the affected
   folders if they are cloud placeholders.

3. Re-run the doctor:

   ```bash
   pnpm doctor:dataless
   ```

4. Only after the placeholder count is reduced should you trust:

   ```bash
   pnpm check-types
   pnpm lint
   pnpm test
   pnpm build
   ```

## Practical rule

If the repo still reports large numbers of dataless placeholders, treat that as
an environment blocker. Fixing the code alone will not make the development
loop trustworthy.
