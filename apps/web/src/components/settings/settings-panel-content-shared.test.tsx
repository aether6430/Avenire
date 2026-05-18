import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  Divider,
  PlanCard,
  Section,
  ToggleRow,
  UsageStatCard,
} from "@/components/settings/settings-panel-content-shared";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/switch", () => ({
  Switch: ({ checked }: { checked: boolean }) =>
    createElement("span", { "data-checked": checked ? "1" : "0" }),
}));

describe("settings panel content shared", () => {
  it("renders sections and dividers with optional description handling", () => {
    const withDescription = renderToStaticMarkup(
      <Section description="Control account settings." title="Account">
        <div>CONTENT</div>
      </Section>
    );
    const withoutDescription = renderToStaticMarkup(
      <Section description="" title="Account">
        <div>CONTENT</div>
      </Section>
    );
    const divider = renderToStaticMarkup(<Divider />);

    expect(withDescription).toContain("Account");
    expect(withDescription).toContain("Control account settings.");
    expect(withDescription).toContain("CONTENT");
    expect(withoutDescription).not.toContain("Control account settings.");
    expect(divider).toContain("border-t");
  });

  it("renders usage cards, toggle rows, and plan cards in both current and upgrade states", () => {
    const usage = renderToStaticMarkup(
      <UsageStatCard
        description="Files available in this workspace."
        icon={() => createElement("svg")}
        label="Files"
        value="42"
      />
    );
    const toggle = renderToStaticMarkup(
      <ToggleRow
        checked
        description="Send receipts to your account email."
        label="Email me receipts"
        onCheckedChange={() => {}}
      />
    );
    const currentPlan = renderToStaticMarkup(
      <PlanCard
        current
        features={["Access to all models"]}
        name="Core"
        onUpgrade={null}
        popular
        price="$8/month"
      />
    );
    const upgradePlan = renderToStaticMarkup(
      <PlanCard
        current={false}
        features={["Priority support"]}
        name="Scholar"
        onUpgrade={() => {}}
        price="$50/month"
      />
    );

    expect(usage).toContain("Files");
    expect(usage).toContain("42");
    expect(usage).toContain("Files available in this workspace.");

    expect(toggle).toContain("Email me receipts");
    expect(toggle).toContain('data-checked="1"');

    expect(currentPlan).toContain("Most Popular");
    expect(currentPlan).toContain("Current Plan");
    expect(currentPlan).not.toContain(">Upgrade<");

    expect(upgradePlan).toContain("Scholar");
    expect(upgradePlan).toContain(">Upgrade<");
    expect(upgradePlan).not.toContain("Current Plan");
  });
});
