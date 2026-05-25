import Link from "next/link";
import { Badge } from "./badge";
import { Button } from "./button";
import { Container } from "./container";
import { Heading } from "./heading";
import { SubHeading } from "./subheading";

export const Hero = () => {
  return (
    <Container className="flex flex-col items-center justify-center border-divide border-x px-4 pt-10 pb-10 md:pt-32 md:pb-20">
      <Badge text="For focused students and researchers" />
      <Heading className="mt-4">
        AI study workspace for <br />
        <span className="text-brand">
          notes, flashcards, quizzes, and tutoring
        </span>
      </Heading>

      <SubHeading as="p" className="mx-auto mt-6 max-w-lg">
        Avenire turns notes, files, questions, and study sessions into one
        connected AI learning workspace for clearer thinking through hard ideas.
      </SubHeading>

      <div className="mt-6 flex items-center gap-4">
        <Button as={Link} href="/waitlist">
          Start learning
        </Button>
        <Button as={Link} href="/pricing" variant="secondary">
          See plans
        </Button>
      </div>
    </Container>
  );
};
