import Link from "next/link";
import {
  pricingTable,
  TIER_NAMES,
  type TierName,
  tiers,
} from "@/components/marketing/constants/pricing";
import { Button } from "./button";
import { Container } from "./container";

const cycleTabs = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
] as const;

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

export const PricingTable = () => {
  return (
    <section className="pricing-table-cycle">
      <input
        className="sr-only"
        defaultChecked
        id="pricing-table-cycle-monthly"
        name="pricing-table-cycle"
        type="radio"
      />
      <input
        className="sr-only"
        id="pricing-table-cycle-yearly"
        name="pricing-table-cycle"
        type="radio"
      />

      <Container className="border-divide border-x">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="">
              <tr className="divide-x divide-divide border-divide border-b">
                <th className="min-w-[220px] px-4 pt-12 pb-8 align-bottom font-medium text-gray-600 text-sm dark:text-neutral-200">
                  <div className="mb-2 font-normal text-gray-600 text-sm dark:text-neutral-200">
                    Select a preferred cycle
                  </div>
                  <div className="inline-flex rounded-md bg-gray-100 p-1 dark:bg-neutral-800">
                    {cycleTabs.map((opt) => (
                      <label
                        className="pricing-table-cycle-tab relative z-10 cursor-pointer rounded-md px-3 py-1 text-gray-800 text-sm dark:text-white"
                        htmlFor={`pricing-table-cycle-${opt.value}`}
                        key={opt.value}
                      >
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </th>
                {orderedTierNames.map((tierName) => (
                  <th
                    className="min-w-[220px] px-4 pt-12 pb-8 align-bottom"
                    key={`hdr-${tierName}`}
                  >
                    <div className="font-medium text-charcoal-700 text-lg dark:text-neutral-100">
                      {tierName}
                    </div>
                    <div className="flex items-center font-normal text-gray-600 text-sm dark:text-neutral-300">
                      $
                      <span className="pricing-table-monthly-only tabular-nums">
                        {titleToPrice[tierName]?.monthly}
                      </span>
                      <span className="pricing-table-yearly-only tabular-nums">
                        {titleToPrice[tierName]?.yearly}
                      </span>
                      <span className="pricing-table-monthly-only ml-1">
                        /seat billed monthly
                      </span>
                      <span className="pricing-table-yearly-only ml-1">
                        /seat billed annually
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
                ))}
              </tr>
            </thead>
            <tbody className="">
              {pricingTable.map((row, index) => (
                <tr
                  className={[
                    "divide-x divide-divide border-divide border-b",
                    index % 2 === 0 ? "bg-gray-50 dark:bg-neutral-800" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={row.title}
                >
                  <td className="flex px-4 py-6 text-center text-charcoal-700 text-sm dark:text-neutral-100">
                    {row.title}
                  </td>
                  {orderedTierNames.map((tierName) => {
                    const tierVal = row.tiers.find(
                      (t) => t.title === tierName
                    )?.value;
                    return (
                      <td
                        className="mx-auto px-4 py-6 text-center text-charcoal-700 text-sm dark:text-neutral-100"
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
