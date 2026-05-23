import { CTA } from "@/components/marketing/cta";
import { DivideX } from "@/components/marketing/divide";
import { FAQs } from "@/components/marketing/faqs";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { PricingBillingSectionsClientBoundary } from "@/components/marketing/pricing-billing-sections-client-boundary";

export function PricingPage() {
  return (
    <MarketingPageShell>
      <PricingBillingSectionsClientBoundary />
      <FAQs />
      <DivideX />
      <CTA />
    </MarketingPageShell>
  );
}
