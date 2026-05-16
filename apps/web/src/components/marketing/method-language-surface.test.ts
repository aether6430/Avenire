import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const faqFile = path.resolve(import.meta.dirname, "./constants/faqs.ts");
const pricingFile = path.resolve(
  import.meta.dirname,
  "./constants/pricing.tsx"
);
const onboardingFile = path.resolve(
  import.meta.dirname,
  "../auth/onboarding-page-client.tsx"
);

describe("method language surfaces", () => {
  it("uses Methods wording in public onboarding and getting-started copy when the product means saved workspace threads", () => {
    const faqSource = readFileSync(faqFile, "utf8");
    const pricingSource = readFileSync(pricingFile, "utf8");
    const onboardingSource = readFileSync(onboardingFile, "utf8");

    expect(faqSource).toContain(
      "Create an account, add a workspace, then start with a method, note, or uploaded file."
    );
    expect(faqSource).not.toContain(
      "Create an account, add a workspace, then start with a chat, note, or uploaded file."
    );

    expect(onboardingSource).toContain(
      "Uploads become reusable context across mindset, notes, and methods."
    );
    expect(onboardingSource).not.toContain(
      "Uploads become reusable context across mindset, notes, and chat."
    );

    expect(pricingSource).toContain("Core AI methods workspace");
    expect(pricingSource).not.toContain("Core AI chat workspace");
    expect(pricingSource).toContain('title: "Mindset Sets"');
    expect(pricingSource).not.toContain('title: "Mindset sets"');
  });
});
