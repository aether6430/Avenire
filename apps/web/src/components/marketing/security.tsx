import Link from "next/link";
import {
  BrainIcon,
  RealtimeSyncIcon,
  SDKIcon,
} from "@/components/marketing/icons/bento-icons";
import { Button } from "./button";
import { Container } from "./container";
import { DivideX } from "./divide";
import { SectionHeading } from "./section-heading";
import { SubHeading } from "./subheading";

const workflowPoints = [
  {
    title: "Misconception memory",
    description:
      "Avenire remembers the exact ideas that tripped you up, then helps turn them into targeted review.",
    icon: BrainIcon,
  },
  {
    title: "Search across study context",
    description:
      "Find answers across notes, PDFs, folders, generated markdown, and prior sessions without rebuilding context.",
    icon: SDKIcon,
  },
  {
    title: "Review that follows the work",
    description:
      "Mindset and spaced repetition come from the material you just studied, not a separate manual workflow.",
    icon: RealtimeSyncIcon,
  },
];

export const Security = () => {
  return (
    <>
      <Container className="border-divide border-x">
        <h2 className="pt-10 pb-5 text-center font-mono text-neutral-500 text-sm uppercase tracking-tight md:pt-20 md:pb-10 dark:text-neutral-400">
          FOR DEEP STUDY SESSIONS
        </h2>
      </Container>
      <DivideX />
      <Container className="grid grid-cols-1 gap-10 border-divide border-x bg-neutral-900/55 px-6 py-12 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div className="max-w-md">
          <SectionHeading className="text-left">
            The workspace gets more useful every session
          </SectionHeading>
          <SubHeading as="p" className="mt-4 text-left">
            Avenire connects the work that usually gets split apart: source
            search, AI explanations, markdown notes, misconception logs, and
            spaced review.
          </SubHeading>
          <Button
            as={Link}
            className="mt-4 mb-8 inline-block w-full md:w-auto"
            href="/waitlist"
          >
            Join the waitlist
          </Button>
        </div>
        <div className="grid gap-3">
          {workflowPoints.map((point) => (
            <div
              className="group rounded-lg border border-white/10 bg-[#0b0b0d] p-5 transition-colors hover:border-brand/40 hover:bg-[#101116]"
              key={point.title}
            >
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand/35 bg-brand/10 text-brand">
                  <point.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-medium text-base text-white">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/58 leading-6">
                    {point.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
};
