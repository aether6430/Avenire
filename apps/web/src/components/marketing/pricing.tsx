import { Badge } from "./badge";
import type { BillingCycle } from "./billing-cycle-tabs";
import { Container } from "./container";
import { PricingPlans } from "./pricing-plans";
import { SectionHeading } from "./section-heading";

export const Pricing = ({
  cycle,
  headingAs = "h2",
  onCycleChange,
}: {
  cycle?: BillingCycle;
  headingAs?: "h1" | "h2";
  onCycleChange?: (cycle: BillingCycle) => void;
}) => {
  return (
    <section className="">
      <Container className="flex flex-col items-center justify-center border-divide border-x pt-10 pb-10">
        <Badge text="Pricing" />
        <SectionHeading as={headingAs} className="mt-4">
          Simple pricing for serious study
        </SectionHeading>
      </Container>
      <PricingPlans cycle={cycle} onCycleChange={onCycleChange} />
    </section>
  );
};
