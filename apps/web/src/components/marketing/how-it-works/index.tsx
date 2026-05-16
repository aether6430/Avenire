import { Badge } from "../badge";
import { Container } from "../container";
import { SectionHeading } from "../section-heading";
import { SubHeading } from "../subheading";
import { HowItWorksTabs, SecondIcon, ThirdIcon } from "./how-it-works-tabs";

export const HowItWorks = () => {
  return (
    <Container className="border-divide border-x">
      <div className="flex flex-col items-center pt-16">
        <Badge text="How it works" />
        <SectionHeading className="mt-4">
          From source to understanding
        </SectionHeading>

        <SubHeading as="p" className="mx-auto mt-6 max-w-lg">
          Avenire keeps the full loop connected: source search, interactive AI
          sessions, misconception capture, notes, and spaced repetition.
        </SubHeading>
        <HowItWorksTabs />
      </div>
    </Container>
  );
};

export { SecondIcon, ThirdIcon };
