"use client";

import { useState } from "react";
import type { BillingCycle } from "./billing-cycle-tabs";
import { DivideX } from "./divide";
import { Pricing } from "./pricing";
import { PricingTable } from "./pricing-table";

export function PricingBillingSections() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <>
      <Pricing cycle={cycle} headingAs="h1" onCycleChange={setCycle} />
      <DivideX />
      <PricingTable cycle={cycle} onCycleChange={setCycle} />
    </>
  );
}
