"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/particle-field", () => ({
  ParticleField: () => <div>PARTICLE_FIELD</div>,
}));

import { AuthShell } from "@/components/auth-shell";

describe("AuthShell", () => {
  it("uses the study-and-research welcome copy on auth entry routes", () => {
    const html = renderToStaticMarkup(
      <AuthShell>
        <div>AUTH_CHILD</div>
      </AuthShell>
    );

    expect(html).toContain("A study-first workspace");
    expect(html).toContain(
      "Built for deep study, research, and interactive reasoning."
    );
    expect(html).not.toContain("A quieter internet");
    expect(html).toContain("AUTH_CHILD");
  });

  it("keeps the onboarding-specific copy for the onboarding variant", () => {
    const html = renderToStaticMarkup(
      <AuthShell variant="onboarding">
        <div>AUTH_CHILD</div>
      </AuthShell>
    );

    expect(html).toContain("A source-first workflow");
    expect(html).toContain(
      "Upload the material, generate the cards, then use Apollo to close the gaps."
    );
  });
});
