import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(import.meta.dirname, "..");
const APP_ROOT = resolve(WEB_ROOT, "app");
const ROOT_LAYOUT_SOURCE = readFileSync(
  resolve(APP_ROOT, "layout.tsx"),
  "utf8"
);
const SONNER_SOURCE = readFileSync(
  resolve(WEB_ROOT, "../../../packages/ui/src/components/sonner.tsx"),
  "utf8"
);

describe("route-level toaster ownership", () => {
  it("keeps auth and waitlist toaster chrome out of the root shell", () => {
    expect(ROOT_LAYOUT_SOURCE).not.toContain("ServiceWorkerRegistration");
    expect(ROOT_LAYOUT_SOURCE).not.toContain(
      '<Toaster closeButton position="top-right" richColors />'
    );
    expect(existsSync(resolve(APP_ROOT, "(auth)/layout.tsx"))).toBe(true);
    expect(existsSync(resolve(APP_ROOT, "waitlist/layout.tsx"))).toBe(true);
    expect(
      existsSync(resolve(import.meta.dirname, "route-toaster-layout.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(import.meta.dirname, "route-toaster-client.tsx"))
    ).toBe(true);
  });

  it("keeps the richer shared toaster class contract for toast chrome and actions", () => {
    expect(SONNER_SOURCE).toContain(
      'toast:\n            "cn-toast border-border! bg-popover! text-popover-foreground! shadow-sm!"'
    );
    expect(SONNER_SOURCE).toContain(
      'closeButton:\n            "border-border! bg-popover! text-popover-foreground! hover:bg-muted!"'
    );
    expect(SONNER_SOURCE).toContain('description: "text-muted-foreground!"');
    expect(SONNER_SOURCE).toContain(
      'actionButton: "bg-primary! text-primary-foreground!"'
    );
    expect(SONNER_SOURCE).toContain(
      'cancelButton: "bg-muted! text-foreground!"'
    );
  });
});
