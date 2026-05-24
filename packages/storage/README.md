# @avenire/storage

Storage/upload helpers shared across Avenire.

## Exports

- root storage helpers
- client helpers (`@avenire/storage/client`)
- SSR helpers (`@avenire/storage/ssr`)

## Surface notes

- `@avenire/storage` owns the shared storage runtime and UploadThing route
  helpers
- `@avenire/storage/client` remains the app-facing entry for React upload
  helpers such as `generateReactHelpers`
- `@avenire/storage/ssr` remains the app-facing entry for the UploadThing SSR
  plugin wrapper used by the web app shell
- these tiny wrappers are intentional package boundaries, even though their
  implementations are small

## Scripts

- `pnpm --filter @avenire/storage build`
- `pnpm --filter @avenire/storage check-types`
- `pnpm --filter @avenire/storage lint`
