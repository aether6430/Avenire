"use client";

import { AgenticIntelligence } from "@/components/marketing/agentic-intelligence";
import { Benefits } from "@/components/marketing/benefits";
import { CTA } from "@/components/marketing/cta";
import { DivideX } from "@/components/marketing/divide";
import { Hero } from "@/components/marketing/hero";
import { HeroImage } from "@/components/marketing/hero-image";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Security } from "@/components/marketing/security";

export function LandingPage() {
  return (
    <MarketingPageShell>
      <Hero />
      <DivideX />
      <HeroImage />
      <DivideX />
      <HowItWorks />
      <DivideX />
      <AgenticIntelligence />
      <DivideX />
      <Benefits />
      <DivideX />
      <Security />
      <DivideX />
      <CTA />
    </MarketingPageShell>
  );
}
