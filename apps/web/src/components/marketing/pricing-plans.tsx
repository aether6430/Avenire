import Link from "next/link";
import type React from "react";
import { tiers } from "@/components/marketing/constants/pricing";
import { CheckIcon } from "@/components/marketing/icons/card-icons";
import { Button } from "./button";
import { Container } from "./container";
import { DivideX } from "./divide";
import { Scale } from "./scale";

const tabs = [
  {
    title: "Monthly",
    value: "monthly",
    badge: "",
  },
  {
    title: "Yearly",
    value: "yearly",
    badge: "Save 20%",
  },
] as const;

export function PricingPlans() {
  return (
    <section className="pricing-cycle">
      <input
        className="sr-only"
        defaultChecked
        id="pricing-cycle-monthly"
        name="pricing-cycle"
        type="radio"
      />
      <input
        className="sr-only"
        id="pricing-cycle-yearly"
        name="pricing-cycle"
        type="radio"
      />
      <div className="pricing-cycle-toggle flex justify-center">
        <div className="relative mt-8 flex items-center gap-4 overflow-hidden rounded-xl border border-white/16 bg-gray-50 p-2 dark:bg-neutral-800">
          <Scale className="opacity-75" />
          {tabs.map((tab) => (
            <label
              className="pricing-cycle-tab relative z-20 flex w-32 cursor-pointer justify-center py-1 text-center sm:w-40"
              htmlFor={`pricing-cycle-${tab.value}`}
              key={tab.value}
            >
              <span className="relative z-20 flex items-center gap-2 text-sm sm:text-base">
                {tab.title}{" "}
                {tab.badge && (
                  <span className="rounded-full bg-brand/10 px-2 py-1 font-medium text-brand text-xs">
                    {tab.badge}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="pricing-cycle-content">
        <DivideX />
        <Container className="border-divide border-x">
          <div className="grid grid-cols-1 divide-y divide-divide md:grid-cols-3 md:divide-x md:divide-y-0">
            {tiers.map((tier) => (
              <div className="p-4 md:p-8" key={`${tier.title}tier-meta`}>
                <h3 className="font-medium text-charcoal-700 text-xl dark:text-neutral-100">
                  {tier.title}
                </h3>
                <p className="text-base text-gray-600 dark:text-neutral-400">
                  {tier.subtitle}
                </p>
                <span className="mt-6 flex items-baseline font-medium text-2xl dark:text-white">
                  $
                  <span className="pricing-monthly-only tabular-nums">
                    {tier.monthly}
                  </span>
                  <span className="pricing-yearly-only tabular-nums">
                    {tier.yearly}
                  </span>
                  <span className="pricing-monthly-only ml-2 font-normal text-sm">
                    /seat
                  </span>
                  <span className="pricing-yearly-only ml-2 font-normal text-sm">
                    /seat
                  </span>
                </span>

                <div
                  className="flex flex-col gap-4 px-0 py-4 md:hidden md:p-8"
                  key={`${tier.title}tier-list-of-items`}
                >
                  {tier.features.map((tierFeature) => (
                    <Step key={tierFeature}>{tierFeature}</Step>
                  ))}
                </div>
                <Button
                  as={Link}
                  className="mt-6 w-full"
                  href={tier.ctaLink as any}
                  variant={tier.featured ? "brand" : "secondary"}
                >
                  {tier.ctaText}
                </Button>
              </div>
            ))}
          </div>
        </Container>
        <DivideX />
        <Container className="hidden border-divide border-x md:block">
          <div className="grid grid-cols-1 divide-divide md:grid-cols-3 md:divide-x">
            {tiers.map((tier) => (
              <div
                className="flex flex-col gap-4 p-4 md:p-8"
                key={`${tier.title}tier-list-of-items`}
              >
                {tier.features.map((tierFeature) => (
                  <Step key={tierFeature}>{tierFeature}</Step>
                ))}
              </div>
            ))}
          </div>
        </Container>
      </div>
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
