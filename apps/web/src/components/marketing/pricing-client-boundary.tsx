"use client";

import dynamic from "next/dynamic";

const Pricing = dynamic(
  () =>
    import("@/components/marketing/pricing").then((module) => ({
      default: module.Pricing,
    })),
  { loading: () => null, ssr: false }
);

export function PricingClientBoundary() {
  return <Pricing />;
}
