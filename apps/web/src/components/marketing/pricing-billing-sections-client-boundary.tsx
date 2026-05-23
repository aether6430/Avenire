"use client";

import dynamic from "next/dynamic";

const PricingBillingSections = dynamic(
  () =>
    import("@/components/marketing/pricing-billing-sections").then(
      (module) => ({
        default: module.PricingBillingSections,
      })
    ),
  { loading: () => null, ssr: false }
);

export function PricingBillingSectionsClientBoundary() {
  return <PricingBillingSections />;
}
