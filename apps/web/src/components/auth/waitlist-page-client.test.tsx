import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { particleFieldMock, waitlistFormMock } = vi.hoisted(() => ({
  particleFieldMock: vi.fn(() =>
    createElement("div", { "data-particle-field": "1" })
  ),
  waitlistFormMock: vi.fn(() =>
    createElement("div", { "data-waitlist-form": "1" })
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));

vi.mock("@/components/ui/particle-field", () => ({
  ParticleField: particleFieldMock,
}));

vi.mock("@avenire/auth/components/waitlist", () => ({
  WaitlistForm: waitlistFormMock,
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-dialog": "1" }, children),
  DialogContent: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-dialog-content": "1" }, children),
  DialogDescription: ({ children }: { children: ReactNode }) =>
    createElement("p", { "data-dialog-description": "1" }, children),
  DialogHeader: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-dialog-header": "1" }, children),
  DialogTitle: ({ children }: { children: ReactNode }) =>
    createElement("h2", { "data-dialog-title": "1" }, children),
}));

import { WaitlistPageClient } from "@/components/auth/waitlist-page-client";

describe("WaitlistPageClient", () => {
  it("renders the public waitlist invite surface and legal links", () => {
    const html = renderToStaticMarkup(<WaitlistPageClient />);

    expect(particleFieldMock).toHaveBeenCalledTimes(1);
    expect(particleFieldMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptToTheme: false,
        color: "rgba(255, 255, 255, 0.92)",
        src: "/figures/empty-room.png",
      }),
      undefined
    );
    expect(html).toContain('data-particle-field="1"');
    expect(html).toContain("Invite-only, for now");
    expect(html).toContain("Early access is opening in waves.");
    expect(html).toContain(
      "Join the waitlist and we&#x27;ll email you as soon as your invite is ready."
    );
    expect(html).toContain("bg-background/40");
    expect(html).toContain("backdrop-blur-sm");
    expect(html).toContain(">Join the waitlist<");
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });

  it("keeps the waitlist dialog shell and form mounted even before the CTA is opened", () => {
    const html = renderToStaticMarkup(<WaitlistPageClient />);

    expect(waitlistFormMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-dialog="1"');
    expect(html).toContain('data-waitlist-form="1"');
    expect(html).toContain("Joining the waitlist means you agree");
  });
});
