# Avenire Extension

## Build

```bash
pnpm --filter @avenire/extension build
```

The output is written to `apps/extension/dist`.

By default the extension talks to:

- `https://avenire.space`
- `http://localhost:3000`

Override those allowed backend origins at build time with:

```bash
AVENIRE_EXTENSION_APP_ORIGINS="https://avenire.space,http://localhost:3000" pnpm --filter @avenire/extension build
```

Load `apps/extension/dist` as an unpacked extension in Chrome.

## Better Auth

For local development, the web app now trusts `chrome-extension://...` and `moz-extension://...`
origins dynamically, so unpacked extension IDs do not need to be added to env one by one.

For production, set the extension origin explicitly:

```bash
BETTER_AUTH_EXTENSION_ORIGINS="chrome-extension://YOUR_EXTENSION_ID"
```

## Usage

- Open the extension options page from the extension details screen to:
  - set the Avenire app origin
  - sign in
  - manage destination presets
  - choose which structured clip properties should be attached to notes
- Use the popup to:
  - choose a saved destination
  - review the generated properties and note content
  - clip into Avenire

Clips are created through the normal workspace file registration route, so note creation and
property syncing follow the same server path as the rest of the app.
