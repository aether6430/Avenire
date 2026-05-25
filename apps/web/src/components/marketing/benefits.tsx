"use client";
import type React from "react";
import { RealtimeSyncIcon } from "@/components/marketing/icons/bento-icons";
import {
  GraphIcon,
  ReuseBrainIcon,
  RocketIcon,
  ScreenCogIcon,
  ShieldIcon,
} from "@/components/marketing/icons/card-icons";
import { Badge } from "./badge";
import { BenefitsMiddleCard } from "./benefits-middle-card";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";
import { SubHeading } from "./subheading";

export const Benefits = () => {
  const benefits = [
    {
      title: "Find the right source",
      description:
        "Search papers, notes, folders, and generated assets from one study surface",
      icon: <RocketIcon className="size-6 text-brand" />,
    },
    {
      title: "Keep session context",
      description:
        "Continue from prior chats, files, and notes without rebuilding the background",
      icon: <RealtimeSyncIcon className="size-6 text-brand" />,
    },
    {
      title: "Map ideas visually",
      description:
        "Connect concepts, dependencies, mistakes, and follow-up questions",
      icon: <GraphIcon className="size-6 text-brand" />,
    },
    {
      title: "Generate durable notes",
      description:
        "Promote useful answers into markdown notes you can edit and reuse",
      icon: <ReuseBrainIcon className="size-6 text-brand" />,
    },
    {
      title: "Track misconceptions",
      description:
        "Log weak spots from sessions and turn them into targeted review",
      icon: <ShieldIcon className="size-6 text-brand" />,
    },
    {
      title: "Review on schedule",
      description:
        "Build spaced repetition from notes, files, and misconception history",
      icon: <ScreenCogIcon className="size-6 text-brand" />,
    },
  ];
  return (
    <Container className="relative overflow-hidden border-divide border-x px-4 py-20 md:px-8">
      <div className="relative flex flex-col items-center">
        <Badge text="Benefits" />
        <SectionHeading className="mt-4">
          Learning tools that solve real study problems
        </SectionHeading>

        <SubHeading as="p" className="mx-auto mt-6 max-w-lg">
          Avenire is built around the moments where studying usually breaks:
          finding context, checking understanding, and returning to what you
          forgot.
        </SubHeading>
      </div>
      <div className="mt-20 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="grid grid-cols-1 gap-4">
          {benefits.slice(0, 3).map((benefit) => (
            <Card key={benefit.title} {...benefit} />
          ))}
        </div>
        <BenefitsMiddleCard />
        <div className="grid grid-cols-1 gap-4">
          {benefits.slice(3, 6).map((benefit) => (
            <Card key={benefit.title} {...benefit} />
          ))}
        </div>
      </div>
    </Container>
  );
};

const Card = (props: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) => {
  const { title, description, icon } = props;
  return (
    <div className="relative z-10 rounded-lg border border-transparent bg-gray-50 p-4 transition duration-200 hover:border-brand/25 hover:bg-transparent md:p-5 dark:bg-neutral-800">
      <div className="flex items-center gap-2">{icon}</div>
      <h3 className="mt-4 mb-2 font-medium text-lg">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};
