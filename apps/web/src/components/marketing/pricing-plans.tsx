"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { tiers } from "@/components/marketing/constants/pricing";
import { CheckIcon } from "@/components/marketing/icons/card-icons";
import { type BillingCycle, BillingCycleTabs } from "./billing-cycle-tabs";
import { Button } from "./button";
import { Container } from "./container";
import { DivideX } from "./divide";

export function PricingPlans({
  cycle: controlledCycle,
  onCycleChange,
}: {
  cycle?: BillingCycle;
  onCycleChange?: (cycle: BillingCycle) => void;
}) {
  const [localCycle, setLocalCycle] = useState<BillingCycle>("monthly");
  const cycle = controlledCycle ?? localCycle;
  const setCycle = onCycleChange ?? setLocalCycle;

  return (
    <section>
      <div className="flex justify-center px-4 pt-2 pb-8">
        <BillingCycleTabs cycle={cycle} onChange={setCycle} />
      </div>
      <DivideX />
      <Container className="border-divide border-x">
        <div className="grid grid-cols-1 divide-y divide-divide md:grid-cols-3 md:divide-x md:divide-y-0">
          {tiers.map((tier) => {
            const price = cycle === "monthly" ? tier.monthly : tier.yearly;

            return (
              <div
                className="flex flex-col p-5 md:p-8"
                key={`${tier.title}tier-meta`}
              >
                <h3 className="font-medium text-charcoal-700 text-xl dark:text-neutral-100">
                  {tier.title}
                </h3>
                <p className="mt-1 text-base text-gray-600 dark:text-neutral-400">
                  {tier.subtitle}
                </p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-medium text-3xl text-white tabular-nums">
                    ${price}
                  </span>
                  <span className="pb-1 font-normal text-sm text-white/56">
                    /seat {cycle === "monthly" ? "monthly" : "yearly"}
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  {tier.features.map((tierFeature) => (
                    <Step key={tierFeature}>{tierFeature}</Step>
                  ))}
                </div>
                <Button
                  as={Link}
                  className="mt-8 w-full"
                  href={tier.ctaLink as any}
                  variant={tier.featured ? "brand" : "secondary"}
                >
                  {tier.ctaText}
                </Button>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

const Step = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex items-center gap-2 text-charcoal-700 dark:text-neutral-100">
      <CheckIcon className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
};
