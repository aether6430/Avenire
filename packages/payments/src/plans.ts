export type PaidPlan = "core" | "scholar";
export type BillingPeriod = "monthly" | "yearly";

function getProductId(plan: PaidPlan, billing: BillingPeriod) {
  const key = `${plan}_${billing}` as const;
  const productIds: Record<typeof key, string | undefined> = {
    core_monthly: process.env.POLAR_PRODUCT_ID_CORE_MONTHLY,
    core_yearly: process.env.POLAR_PRODUCT_ID_CORE_YEARLY,
    scholar_monthly: process.env.POLAR_PRODUCT_ID_SCHOLAR_MONTHLY,
    scholar_yearly: process.env.POLAR_PRODUCT_ID_SCHOLAR_YEARLY,
  };

  return productIds[key] ?? "";
}

export function mapProductIdToPlan(productId?: string | null): PaidPlan | null {
  if (!productId) {
    return null;
  }

  const planByProduct = new Map<string, PaidPlan>();
  const mappings: Array<{ plan: PaidPlan; billing: BillingPeriod }> = [
    { plan: "core", billing: "monthly" },
    { plan: "core", billing: "yearly" },
    { plan: "scholar", billing: "monthly" },
    { plan: "scholar", billing: "yearly" },
  ];

  for (const mapping of mappings) {
    const mappedProduct = getProductId(mapping.plan, mapping.billing);
    if (mappedProduct) {
      planByProduct.set(mappedProduct, mapping.plan);
    }
  }

  return planByProduct.get(productId) ?? null;
}
