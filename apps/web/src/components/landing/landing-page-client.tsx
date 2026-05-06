"use client";

import { AgenticIntelligence } from "@/components/marketing/agentic-intelligence";
import { Benefits } from "@/components/marketing/benefits";
import { CTA } from "@/components/marketing/cta";
import { DivideX } from "@/components/marketing/divide";
import { FAQs } from "@/components/marketing/faqs";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HeroImage } from "@/components/marketing/hero-image";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Navbar } from "@/components/marketing/navbar";
import { Pricing } from "@/components/marketing/pricing";
import { Security } from "@/components/marketing/security";

export function LandingPageClient() {
  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      <DivideX />
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
      <Pricing />
      <DivideX />
      <Security />
      <DivideX />
      <FAQs />
      <DivideX />
      <CTA />
      <DivideX />
      <Footer />
    </main>
  );
}
