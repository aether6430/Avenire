import type React from "react";
import { faqs } from "@/components/marketing/constants/faqs";
import { Badge } from "./badge";
import { Button } from "./button";
import { Container } from "./container";
import { DivideX } from "./divide";
import { SectionHeading } from "./section-heading";
import { SubHeading } from "./subheading";

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={props.className}
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.75 6.5L8 10.75L12.25 6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export const FAQs = () => {
  return (
    <Container className="flex flex-col items-center border-divide border-x pt-12">
      <Badge text="FAQs" />
      <SectionHeading className="mt-4">
        Frequently Asked Questions
      </SectionHeading>

      <SubHeading as="p" className="mx-auto mt-6 max-w-lg px-2">
        Answers about plans, study workflows, and how Avenire fits into daily
        learning.
      </SubHeading>
      <div className="mt-8 mb-12 flex w-full flex-col justify-center gap-4 px-4 sm:flex-row">
        <Button className="w-full sm:w-auto" variant="primary">
          Read Blog
        </Button>
        <Button
          as="a"
          className="w-full sm:w-auto"
          href="mailto:support@avenire.space"
          variant="secondary"
        >
          Contact Us
        </Button>
      </div>
      <DivideX />
      <div className="w-full divide-y divide-divide">
        {faqs.map((item, index) => (
          <details className="group" key={item.question}>
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 px-8 py-6 text-left [&::-webkit-details-marker]:hidden"
              id={`faq-summary-${index}`}
            >
              <span className="font-medium text-base text-charcoal-700 dark:text-neutral-100">
                {item.question}
              </span>
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-white text-charcoal-700 shadow-aceternity transition-transform duration-200 group-open:rotate-180 dark:bg-neutral-950">
                <ChevronDownIcon className="dark:text-neutral-100" />
              </span>
            </summary>
            <div
              aria-labelledby={`faq-summary-${index}`}
              className="overflow-hidden px-8 pb-5"
              role="region"
            >
              <div className="pr-2 pl-2 sm:pr-0 sm:pl-0">
                <p className="text-gray-600 dark:text-neutral-400">
                  {item.answer}
                </p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </Container>
  );
};
