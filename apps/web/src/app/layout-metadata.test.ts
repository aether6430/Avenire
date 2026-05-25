import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/local", () => ({
  default: () => ({
    variable: "--font-mock",
  }),
}));

import { metadata, viewport } from "./layout";

const APP_ROOT = path.resolve(import.meta.dirname);
const FAVICON_PATH = path.join(APP_ROOT, "favicon.ico");
const ROOT_FAVICON_SVG_PATH = path.resolve(
  APP_ROOT,
  "../../public/favicon.svg"
);
const ROOT_LAYOUT_SOURCE = readFileSync(
  path.join(APP_ROOT, "layout.tsx"),
  "utf8"
);

describe("root layout metadata assets", () => {
  it("ships a root favicon via the app file convention", () => {
    expect(existsSync(FAVICON_PATH)).toBe(true);
  });

  it("ships the advertised root svg favicon asset", () => {
    expect(existsSync(ROOT_FAVICON_SVG_PATH)).toBe(true);
  });

  it("keeps root metadata icons and viewport theme colors aligned with the current public shell", () => {
    expect(metadata.manifest).toBe("/manifest.json");
    expect(metadata.icons).toEqual({
      apple: "/branding/avenire-logo-full.png",
      icon: [
        { type: "image/svg+xml", url: "/favicon.svg" },
        { type: "image/png", url: "/branding/avenire-logo-full.png" },
      ],
      shortcut: "/favicon.svg",
    });
    expect(viewport).toEqual({
      themeColor: [
        { color: "#fcfcfc", media: "(prefers-color-scheme: light)" },
        { color: "#141414", media: "(prefers-color-scheme: dark)" },
      ],
    });
  });

  it("keeps the root shell focused on document chrome rather than route-specific client effects", () => {
    expect(ROOT_LAYOUT_SOURCE).not.toContain("ThemeProvider");
    expect(ROOT_LAYOUT_SOURCE).not.toContain("ServiceWorkerRegistration");
    expect(ROOT_LAYOUT_SOURCE).not.toContain(
      'Toaster closeButton position="top-right" richColors'
    );
  });
});
