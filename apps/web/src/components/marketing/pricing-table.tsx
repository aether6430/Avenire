"use client";

import Link from "next/link";
import { useState } from "react";
import {
  pricingTable,
  TIER_NAMES,
  type TierName,
  tiers,
} from "@/components/marketing/constants/pricing";
import { type BillingCycle, BillingCycleTabs } from "./billing-cycle-tabs";
import { Button } from "./button";
import { Container } from "./container";

const orderedTierNames: TierName[] = [
  TIER_NAMES.TIER_1,
  TIER_NAMES.TIER_2,
  TIER_NAMES.TIER_3,
];

const titleToPrice = Object.fromEntries(
  tiers.map((tier) => [
    tier.title,
    { monthly: tier.monthly, yearly: tier.yearly },
  ])
) as Record<string, { monthly: number; yearly: number }>;

export const PricingTable = ({
  cycle: controlledCycle,
  onCycleChange,
}: {
  cycle?: BillingCycle;
  onCycleChange?: (cycle: BillingCycle) => void;
}) => {
  const [localCycle, setLocalCycle] = useState<BillingCycle>("monthly");
  const cycle = controlledCycle ?? localCycle;
  const setCycle = onCycleChange ?? setLocalCycle;

  return (
    <section className="pt-2">
      <Container className="border-divide border-x">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="divide-x divide-divide border-divide border-b align-bottom">
                <th className="min-w-[220px] px-4 pt-10 pb-6 font-medium text-gray-600 text-sm dark:text-neutral-200">
                  <div className="mb-3 font-normal text-white/48 text-xs uppercase tracking-[0.16em]">
                    Billing cycle
                  </div>
                  <BillingCycleTabs
                    className="rounded-xl"
                    cycle={cycle}
                    onChange={setCycle}
                  />
                </th>
                {orderedTierNames.map((tierName) => {
                  const price = titleToPrice[tierName]?.[cycle];

                  return (
                    <th
                      className="min-w-[220px] px-4 pt-10 pb-6"
                      key={`hdr-${tierName}`}
                    >
                      <div className="font-medium text-charcoal-700 text-lg dark:text-neutral-100">
                        {tierName}
                      </div>
                      <div className="mt-2 flex items-end gap-2 font-normal text-gray-600 text-sm dark:text-neutral-300">
                        <span className="font-medium text-2xl text-white tabular-nums">
                          ${price}
                        </span>
                        <span className="pb-0.5 text-white/56">
                          /seat {cycle}
                        </span>
                      </div>
                      <Button
                        as={Link}
                        className="mt-4 w-full"
                        href="/waitlist"
                        variant="secondary"
                      >
                        Join waitlist
                      </Button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pricingTable.map((row, index) => (
                <tr
                  className={[
                    "divide-x divide-divide border-divide border-b",
                    index % 2 === 0 ? "bg-white/[0.03]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={row.title}
                >
                  <td className="px-4 py-5 text-charcoal-700 text-sm dark:text-neutral-100">
                    {row.title}
                  </td>
                  {orderedTierNames.map((tierName) => {
                    const tierVal = row.tiers.find(
                      (t) => t.title === tierName
                    )?.value;

                    return (
                      <td
                        className="px-4 py-5 text-center text-charcoal-700 text-sm dark:text-neutral-100"
                        key={`${row.title}-${tierName}`}
                      >
                        {tierVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
};

export default PricingTable;
