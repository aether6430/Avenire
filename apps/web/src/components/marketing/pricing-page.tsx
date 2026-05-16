import { CTA } from "@/components/marketing/cta";
import { DivideX } from "@/components/marketing/divide";
import { FAQs } from "@/components/marketing/faqs";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { Pricing } from "@/components/marketing/pricing";
import { PricingTable } from "@/components/marketing/pricing-table";

export function PricingPage() {
  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      <DivideX />
      <Pricing headingAs="h1" />
      <DivideX />
      <PricingTable />
      <FAQs />
      <DivideX />
      <CTA />
      <DivideX />
      <Footer />
    </main>
  );
}
