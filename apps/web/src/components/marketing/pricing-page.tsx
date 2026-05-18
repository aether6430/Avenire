import { CTA } from "@/components/marketing/cta";
import { DivideX } from "@/components/marketing/divide";
import { FAQs } from "@/components/marketing/faqs";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { PricingBillingSections } from "@/components/marketing/pricing-billing-sections";

export function PricingPage() {
  return (
    <MarketingPageShell>
      <PricingBillingSections />
      <FAQs />
      <DivideX />
      <CTA />
    </MarketingPageShell>
  );
}
