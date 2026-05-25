import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  resolve(import.meta.dirname, "./globals.css"),
  "utf8"
);

describe("globals.css Tailwind source boundaries", () => {
  it("scans app source instead of the entire apps/web directory", () => {
    expect(globalsCss).toContain('@source "../**/*.{js,ts,jsx,tsx}";');
    expect(globalsCss).not.toContain(
      '@source "../../../**/*.{js,ts,jsx,tsx}";'
    );
  });

  it("avoids broad package globs that pull compiled workspace artifacts into Tailwind", () => {
    expect(globalsCss).toContain(
      '@source "../../../../packages/ui/src/components/sidebar.tsx";'
    );
    expect(globalsCss).not.toContain(
      '@source "../../../../packages/ui/src/components/avatar.tsx";'
    );
    expect(globalsCss).not.toContain(
      '@source "../../../../packages/ui/components/**/*.{ts,tsx}";'
    );
    expect(globalsCss).not.toContain(
      '@source "../../../../packages/ui/src/**/*.{js,ts,jsx,tsx}";'
    );
    expect(globalsCss).not.toContain(
      '@source "../../../../packages/**/*.{js,ts,jsx,tsx}";'
    );
  });
});
