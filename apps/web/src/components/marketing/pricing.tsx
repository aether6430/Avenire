import { Badge } from "./badge";
import { Container } from "./container";
import { PricingPlans } from "./pricing-plans";
import { SectionHeading } from "./section-heading";

export const Pricing = ({ headingAs = "h2" }: { headingAs?: "h1" | "h2" }) => {
  return (
    <section className="">
      <Container className="flex flex-col items-center justify-center border-divide border-x pt-10 pb-10">
        <Badge text="Pricing" />
        <SectionHeading as={headingAs} className="mt-4">
          Simple pricing for serious study
        </SectionHeading>
      </Container>
      <PricingPlans />
    </section>
  );
};
