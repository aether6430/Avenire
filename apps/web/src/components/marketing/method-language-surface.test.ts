import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  TIER_NAMES,
  type TierName,
} from "@/components/marketing/constants/pricing";
import { resolvePricingCallToAction } from "@/components/marketing/pricing-cta-model";

const faqFile = path.resolve(import.meta.dirname, "./constants/faqs.ts");
const pricingFile = path.resolve(
  import.meta.dirname,
  "./constants/pricing.tsx"
);
const pricingPlansFile = path.resolve(
  import.meta.dirname,
  "./pricing-plans.tsx"
);
const pricingPageFile = path.resolve(import.meta.dirname, "./pricing-page.tsx");
const landingPageFile = path.resolve(import.meta.dirname, "./landing-page.tsx");
const pricingRouteFile = path.resolve(
  import.meta.dirname,
  "../../app/pricing/page.tsx"
);
const pricingSectionsBoundaryFile = path.resolve(
  import.meta.dirname,
  "./pricing-billing-sections-client-boundary.tsx"
);
const pricingTableFile = path.resolve(
  import.meta.dirname,
  "./pricing-table.tsx"
);
const footerFile = path.resolve(import.meta.dirname, "./footer.tsx");
const heroFile = path.resolve(import.meta.dirname, "./hero.tsx");
const ctaFile = path.resolve(import.meta.dirname, "./cta.tsx");
const securityFile = path.resolve(import.meta.dirname, "./security.tsx");
const marketingButtonFile = path.resolve(import.meta.dirname, "./button.tsx");
const billingCycleTabsFile = path.resolve(
  import.meta.dirname,
  "./billing-cycle-tabs.tsx"
);
const shimmerTextFile = path.resolve(import.meta.dirname, "./shimmer-text.tsx");
const meshGradientFile = path.resolve(
  import.meta.dirname,
  "./mesh-gradient.tsx"
);
const marketingIllustrationsFile = path.resolve(
  import.meta.dirname,
  "./icons/illustrations.tsx"
);
const agenticIntelligenceFile = path.resolve(
  import.meta.dirname,
  "./agentic-intelligence/index.tsx"
);
const agenticIntelligenceSkeletonsFile = path.resolve(
  import.meta.dirname,
  "./agentic-intelligence/skeletons.tsx"
);
const agenticIntelligenceStaticSkeletonsFile = path.resolve(
  import.meta.dirname,
  "./agentic-intelligence/static-skeletons.tsx"
);
const billingPlansFile = path.resolve(
  import.meta.dirname,
  "../../lib/billing-plans.ts"
);
const navbarFile = path.resolve(import.meta.dirname, "./navbar.tsx");
const onboardingFile = path.resolve(
  import.meta.dirname,
  "../auth/onboarding-page-client.tsx"
);
const roadmapFile = path.resolve(
  import.meta.dirname,
  "../../../content/roadmap.json"
);
const introducingAvenireBlogFile = path.resolve(
  import.meta.dirname,
  "../../../content/blog/introducing-avenire.mdx"
);
const howItWorksTabsFile = path.resolve(
  import.meta.dirname,
  "./how-it-works/how-it-works-tabs.tsx"
);
const rootReadmeFile = path.resolve(
  import.meta.dirname,
  "../../../../../README.md"
);
const webReadmeFile = path.resolve(import.meta.dirname, "../../../README.md");

describe("method language surfaces", () => {
  it("uses Methods wording in public onboarding and getting-started copy when the product means saved workspace threads", () => {
    const faqSource = readFileSync(faqFile, "utf8");
    const footerSource = readFileSync(footerFile, "utf8");
    const pricingSource = readFileSync(pricingFile, "utf8");
    const pricingPlansSource = readFileSync(pricingPlansFile, "utf8");
    const pricingPageSource = readFileSync(pricingPageFile, "utf8");
    const landingPageSource = readFileSync(landingPageFile, "utf8");
    const pricingRouteSource = readFileSync(pricingRouteFile, "utf8");
    const pricingSectionsBoundarySource = readFileSync(
      pricingSectionsBoundaryFile,
      "utf8"
    );
    const pricingTableSource = readFileSync(pricingTableFile, "utf8");
    const onboardingSource = readFileSync(onboardingFile, "utf8");
    const heroSource = readFileSync(heroFile, "utf8");
    const ctaSource = readFileSync(ctaFile, "utf8");
    const securitySource = readFileSync(securityFile, "utf8");
    const marketingButtonSource = readFileSync(marketingButtonFile, "utf8");
    const billingCycleTabsSource = readFileSync(billingCycleTabsFile, "utf8");
    const shimmerTextSource = readFileSync(shimmerTextFile, "utf8");
    const meshGradientSource = readFileSync(meshGradientFile, "utf8");
    const agenticIntelligenceSource = readFileSync(
      agenticIntelligenceFile,
      "utf8"
    );
    const agenticIntelligenceSkeletonsSource = readFileSync(
      agenticIntelligenceSkeletonsFile,
      "utf8"
    );
    const billingPlansSource = readFileSync(billingPlansFile, "utf8");
    const navbarSource = readFileSync(navbarFile, "utf8");
    const roadmapSource = readFileSync(roadmapFile, "utf8");
    const introducingAvenireBlogSource = readFileSync(
      introducingAvenireBlogFile,
      "utf8"
    );
    const howItWorksTabsSource = readFileSync(howItWorksTabsFile, "utf8");
    const rootReadmeSource = readFileSync(rootReadmeFile, "utf8");
    const webReadmeSource = readFileSync(webReadmeFile, "utf8");

    expect(faqSource).toContain(
      "Create an account, add a workspace, then start with a method, note, or uploaded file."
    );
    expect(faqSource).not.toContain(
      "Create an account, add a workspace, then start with a chat, note, or uploaded file."
    );
    expect(faqSource).toContain(
      "methods, Mindset Sets, graphing, and research"
    );
    expect(faqSource).toContain(
      "graphing, Mindset Sets, and spaced repetition."
    );
    expect(faqSource).not.toContain("methods, mindset sets, graphing");
    expect(faqSource).not.toContain(
      "graphing, mindset sets, and spaced repetition."
    );

    expect(onboardingSource).toContain(
      "Uploads become reusable context across mindset, notes, and methods."
    );
    expect(onboardingSource).not.toContain(
      "Uploads become reusable context across mindset, notes, and chat."
    );
    expect(onboardingSource).toContain(
      "Generate a first Mindset Set from the material you just added."
    );
    expect(onboardingSource).toContain("Build the first Mindset Set.");
    expect(onboardingSource).not.toContain(
      "Generate a first mindset set from the material you just added."
    );
    expect(onboardingSource).not.toContain("Build the first mindset set.");

    expect(heroSource).toContain("Build the workspace");
    expect(heroSource).toContain("behind");
    expect(heroSource).toContain("Start learning");
    expect(heroSource).not.toContain("AI Learning Workspace");
    expect(heroSource).not.toContain("Join waitlist");
    expect(landingPageSource).toContain("PricingClientBoundary");
    expect(landingPageSource).toContain("FAQs");
    expect(landingPageSource).not.toContain("Pricing />");
    expect(ctaSource).toContain("Join the waitlist");
    expect(ctaSource).not.toContain("Join waitlist");
    expect(securitySource).toContain("Join the waitlist");
    expect(securitySource).not.toContain("Join waitlist");
    expect(navbarSource).toContain("Join the waitlist");
    expect(navbarSource).not.toContain("Join waitlist");
    expect(navbarSource).toContain('Button as="a"');
    expect(navbarSource).toContain("h-11");
    expect(navbarSource).toContain("whitespace-nowrap");
    expect(navbarSource).toContain("max-[340px]:px-3");
    expect(navbarSource).toContain("max-[340px]:text-[13px]");
    expect(marketingButtonSource).toContain("text-[var(--primary-foreground)]");
    expect(marketingButtonSource).not.toContain("text-[#1b2733]");
    expect(billingCycleTabsSource).toContain(
      "bg-brand text-[var(--primary-foreground)]"
    );
    expect(billingCycleTabsSource).toContain(
      "bg-black/10 text-[var(--primary-foreground)]"
    );
    expect(billingCycleTabsSource).not.toContain("text-[#1b2733]");
    expect(agenticIntelligenceSkeletonsSource).toContain(
      "text-[var(--primary-foreground)] text-sm"
    );
    expect(agenticIntelligenceSkeletonsSource).not.toContain("text-[#1b2733]");
    expect(meshGradientSource).toContain('resolved.at(-1) ?? "#fcfcfc"');
    expect(meshGradientSource).not.toContain('resolved.at(-1) ?? "#ffffff"');
    expect(existsSync(marketingIllustrationsFile)).toBe(false);
    expect(shimmerTextSource).toContain('"use client";');
    expect(shimmerTextSource).toContain("motion.create");
    expect(shimmerTextSource).toContain("React.memo(TextShimmerCore)");
    expect(shimmerTextSource).not.toContain("avenire-text-shimmer");
    expect(agenticIntelligenceSource).toContain("Native learning tools");
    expect(agenticIntelligenceSource).toContain(
      "Keep source files, editable notes, concept graphs, AI help, and"
    );
    expect(agenticIntelligenceSource).toContain("review cards");
    expect(agenticIntelligenceSource).toContain(
      "targeted Mindset Sets and future review."
    );
    expect(agenticIntelligenceSource).toContain(
      "Turn missed ideas into Mindset Sets and review prompts"
    );
    expect(agenticIntelligenceSource).not.toContain("targeted mindset cards");
    expect(agenticIntelligenceSource).not.toContain(
      "Turn missed ideas into mindset cards"
    );
    expect(agenticIntelligenceSource).not.toContain("targeted flashcards");
    expect(agenticIntelligenceSource).toContain(
      'TextToWorkflowBuilderSkeleton,\n} from "./skeletons";'
    );
    expect(agenticIntelligenceSource).not.toContain("./static-skeletons");
    expect(agenticIntelligenceSkeletonsSource).toContain(
      "export const LLMModelSelectorSkeleton"
    );
    expect(agenticIntelligenceSkeletonsSource).toContain(
      "export const NativeToolsIntegrationSkeleton"
    );
    expect(agenticIntelligenceSkeletonsSource).toContain(
      "study plan and Mindset Sets?"
    );
    expect(agenticIntelligenceSkeletonsSource).not.toContain(
      "study plan and mindset cards?"
    );
    expect(existsSync(agenticIntelligenceStaticSkeletonsFile)).toBe(false);
    expect(
      readFileSync(
        path.resolve(import.meta.dirname, "./benefits-middle-card.tsx"),
        "utf8"
      )
    ).toContain('"Mindset Set ready"');
    expect(
      readFileSync(
        path.resolve(import.meta.dirname, "./benefits-middle-card.tsx"),
        "utf8"
      )
    ).not.toContain('"Mindset ready"');
    expect(howItWorksTabsSource).toContain(
      "generate Mindset Sets, and schedule review around the concepts you missed"
    );
    expect(howItWorksTabsSource).toContain(
      "Convert missed concepts into notes, Mindset Sets, and scheduled review."
    );
    expect(howItWorksTabsSource).not.toContain(
      "generate mindset sets, and schedule review around the concepts you missed"
    );
    expect(howItWorksTabsSource).not.toContain(
      "Convert missed concepts into notes, mindset cards, and scheduled review."
    );

    expect(pricingSource).toContain("Core AI methods workspace");
    expect(pricingSource).not.toContain("Core AI chat workspace");
    expect(pricingSource).toContain('title: "Mindset Sets"');
    expect(pricingSource).not.toContain('title: "Mindset sets"');
    expect(pricingSource).toContain('ctaText: "Join the waitlist"');
    expect(pricingSource).not.toContain('ctaText: "Join waitlist"');
    expect(pricingTableSource).toContain(
      'fallbackTier?.ctaText ?? "Join the waitlist"'
    );
    expect(pricingTableSource).not.toContain(
      'fallbackTier?.ctaText ?? "Join waitlist"'
    );
    expect(pricingPlansSource).toContain("resolvePricingCallToAction");
    expect(pricingTableSource).toContain("resolvePricingCallToAction");
    expect(pricingPlansSource).toContain("authClient.checkout");
    expect(pricingTableSource).toContain("authClient.checkout");
    expect(pricingPlansSource).toContain("useSession");
    expect(pricingTableSource).toContain("useSession");
    expect(pricingRouteSource).toContain('title: "Pricing"');
    expect(pricingPageSource).toContain("PricingBillingSectionsClientBoundary");
    expect(pricingPageSource).not.toContain("<PricingBillingSections />");
    expect(pricingSectionsBoundarySource).toContain('"use client"');
    expect(pricingSectionsBoundarySource).toContain("dynamic(");
    expect(pricingSectionsBoundarySource).toContain("ssr: false");
    expect(pricingTableSource).toContain("formatInr(price ?? 0)");
    expect(pricingTableSource).toContain("getYearlyDiscountPercent(");
    expect(pricingTableSource).not.toContain("/seat");
    expect(pricingTableSource).toContain('"/mo"');
    expect(pricingTableSource).toContain('"/yr"');
    expect(billingPlansSource).toContain(
      '"Methods, notes, and workspace search"'
    );
    expect(billingPlansSource).toContain(
      '"Mindset Sets with spaced repetition"'
    );
    expect(billingPlansSource).not.toContain('"Core AI methods workspace"');
    expect(billingPlansSource).not.toContain(
      '"Full workspace with file & note search"'
    );
    expect(billingPlansSource).not.toContain(
      '"Flashcards with spaced repetition"'
    );

    expect(footerSource).toContain(
      '{ label: "Mindset Sets", href: "/workspace/flashcards" }'
    );
    expect(footerSource).not.toContain(
      '{ label: "Mindset sets", href: "/workspace/flashcards" }'
    );
    expect(footerSource).not.toContain('label: "GitHub"');
    expect(footerSource).not.toContain("github.com/thedamod/Avenire");

    expect(rootReadmeSource).toContain(
      "retrieval context, Mindset Sets, tasks, and guided chat."
    );
    expect(rootReadmeSource).toContain(
      "Mindset Sets, misconceptions, and study workflows"
    );
    expect(rootReadmeSource).not.toContain(
      "retrieval context, mindset sets, tasks, and guided chat."
    );
    expect(rootReadmeSource).not.toContain(
      "- mindset sets, misconceptions, and study workflows"
    );
    expect(rootReadmeSource).toContain(
      "`Mindset Sets` are the study/review sets"
    );
    expect(rootReadmeSource).not.toContain(
      "`Mindset sets` are the study/review sets"
    );

    expect(webReadmeSource).toContain(
      "editor, Mindset Sets, tasks, settings, and marketing"
    );
    expect(webReadmeSource).toContain(
      "authenticated workspace with methods, notes, files, tasks, and Mindset Sets"
    );
    expect(webReadmeSource).toContain(
      "`src/components/flashcards` — Mindset Set dashboard, sidebar, set detail, and"
    );
    expect(webReadmeSource).not.toContain(
      "editor, mindset sets, tasks, settings, and marketing"
    );
    expect(webReadmeSource).not.toContain(
      "authenticated workspace with methods, notes, files, tasks, and mindset sets"
    );
    expect(webReadmeSource).not.toContain(
      "`src/components/flashcards` — mindset set dashboard, sidebar, set detail, and"
    );
    expect(webReadmeSource).toContain(
      "`Mindset Sets` are the review/study sets surfaced in their own workspace area."
    );
    expect(webReadmeSource).not.toContain(
      "`Mindset Sets` are the review/study sets surfaced in the flashcards area."
    );
    expect(webReadmeSource).not.toContain(
      "`Mindset sets` are the review/study sets"
    );

    expect(roadmapSource).not.toContain('"id": "circle-to-ai"');
    expect(roadmapSource).not.toContain("Circle to AI (Halo)");
    expect(roadmapSource).toContain('"title": "Mindset Sets with SRS"');
    expect(roadmapSource).toContain(
      '"description": "Generate spaced-repetition Mindset Sets from notes and study material."'
    );
    expect(roadmapSource).not.toContain('"title": "Flashcards with SRS"');
    expect(roadmapSource).not.toContain(
      '"description": "Generate spaced-repetition flashcards from notes and study material."'
    );
    expect(introducingAvenireBlogSource).toContain(
      "- convert important ideas into Mindset Sets or review prompts,"
    );
    expect(introducingAvenireBlogSource).not.toContain(
      "- convert important ideas into flashcards or review prompts,"
    );
  });

  it("routes signed-in pricing CTAs straight into the app and live billing checkout", () => {
    const cases: Array<{
      cycle: "monthly" | "yearly";
      expectedHref: string;
      expectedLabel: string;
      tierName: TierName;
    }> = [
      {
        cycle: "monthly",
        expectedHref: "/workspace",
        expectedLabel: "Go to app",
        tierName: TIER_NAMES.TIER_1,
      },
      {
        cycle: "monthly",
        expectedHref: "/api/billing/checkout?plan=core&billing=monthly",
        expectedLabel: "Upgrade",
        tierName: TIER_NAMES.TIER_2,
      },
      {
        cycle: "yearly",
        expectedHref: "/api/billing/checkout?plan=scholar&billing=yearly",
        expectedLabel: "Upgrade",
        tierName: TIER_NAMES.TIER_3,
      },
    ];

    for (const testCase of cases) {
      expect(
        resolvePricingCallToAction({
          cycle: testCase.cycle,
          isSignedIn: true,
          signedOutHref: "/waitlist",
          signedOutLabel: "Join the waitlist",
          tierName: testCase.tierName,
        })
      ).toMatchObject(
        testCase.tierName === TIER_NAMES.TIER_1
          ? {
              href: testCase.expectedHref,
              kind: "link",
              label: testCase.expectedLabel,
            }
          : {
              checkoutSlug:
                testCase.tierName === TIER_NAMES.TIER_2
                  ? "core-monthly"
                  : "scholar-yearly",
              fallbackHref: testCase.expectedHref,
              kind: "checkout",
              label: testCase.expectedLabel,
            }
      );
    }

    expect(
      resolvePricingCallToAction({
        cycle: "monthly",
        isSignedIn: false,
        signedOutHref: "/waitlist",
        signedOutLabel: "Join the waitlist",
        tierName: TIER_NAMES.TIER_2,
      })
    ).toEqual({
      href: "/waitlist",
      kind: "link",
      label: "Join the waitlist",
    });
  });
});
