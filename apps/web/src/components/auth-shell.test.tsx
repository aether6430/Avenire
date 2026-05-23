"use client";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { particleFieldMock } = vi.hoisted(() => ({
  particleFieldMock: vi.fn(({ src }: { src?: string }) =>
    createElement("div", { "data-particle-field": src ?? "1" })
  ),
}));

vi.mock("next/dynamic", () => ({
  default: vi.fn(() => particleFieldMock),
}));

vi.mock("@/components/ui/particle-field", () => ({
  ParticleField: particleFieldMock,
}));

import { AuthShell } from "@/components/auth-shell";

const authShellSource = readFileSync(
  resolve(import.meta.dirname, "./auth-shell.tsx"),
  "utf8"
);
const removedAuthParticlePageFile = resolve(
  import.meta.dirname,
  "./auth/auth-particle-page.tsx"
);

describe("AuthShell", () => {
  beforeEach(() => {
    particleFieldMock.mockClear();
  });

  it("uses the current upstream welcome copy and fixed particle palette on auth entry routes", () => {
    const html = renderToStaticMarkup(
      <AuthShell>
        <div>AUTH_CHILD</div>
      </AuthShell>
    );

    expect(html).toContain("A quieter internet");
    expect(html).toContain("Built for people who prefer focus over noise.");
    expect(html).not.toContain("A study-first workspace");
    expect(html).toContain("AUTH_CHILD");
    expect(particleFieldMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptToTheme: false,
        color: "rgba(255, 255, 255, 0.92)",
        src: "/figures/welcome.png",
      }),
      undefined
    );
  });

  it("keeps the onboarding copy while using the same fixed particle palette", () => {
    const html = renderToStaticMarkup(
      <AuthShell variant="onboarding">
        <div>AUTH_CHILD</div>
      </AuthShell>
    );

    expect(html).toContain("A source-first workflow");
    expect(html).toContain(
      "Upload the material, generate the cards, then use Apollo to close the gaps."
    );
    expect(particleFieldMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptToTheme: false,
        color: "rgba(255, 255, 255, 0.92)",
        src: "/figures/onboarding-team.png",
      }),
      undefined
    );
  });

  it("keeps particle-field loading ownership in AuthShell and leaves the old shared auth particle page deleted", () => {
    expect(authShellSource).toContain("const ParticleField = dynamic(");
    expect(authShellSource).toContain("ssr: false");
    expect(existsSync(removedAuthParticlePageFile)).toBe(false);
  });
});
