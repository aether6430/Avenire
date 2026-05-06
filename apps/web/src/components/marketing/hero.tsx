"use client";
import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { SubHeading } from "./subheading";
import { Button } from "./button";
import { Badge } from "./badge";
import Link from "next/link";

export const Hero = () => {
  return (
    <Container className="border-divide flex flex-col items-center justify-center border-x px-4 pt-10 pb-10 md:pt-32 md:pb-20">
      <Badge text="For focused students and researchers" />
      <Heading className="mt-4">
        Build the workspace <br /> behind{" "}
        <span className="text-brand">clearer thinking</span>
      </Heading>

      <SubHeading className="mx-auto mt-6 max-w-lg">
        Avenire turns notes, files, questions, and study sessions into one
        connected AI workspace for learning deeply and working through hard
        ideas.
      </SubHeading>

      <div className="mt-6 flex items-center gap-4">
        <Button as={Link} href="/waitlist">
          Join waitlist
        </Button>
        <Button variant="secondary" as={Link} href="/pricing">
          View pricing
        </Button>
      </div>
    </Container>
  );
};
