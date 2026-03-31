import { PricingPageClient } from "@/components/landing/pricing-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Compare Avenire pricing for AI-powered learning, research, and interactive study workflows.",
  path: "/pricing",
  title: "Pricing",
});

export default function PricingPage() {
  return <PricingPageClient />;
}
