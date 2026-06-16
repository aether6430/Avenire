"use client";
import React, { useEffect, useState } from "react";
import { Container } from "./container";
import { Badge } from "./badge";
import { SectionHeading } from "./seciton-heading";
import { SubHeading } from "./subheading";
import {
  RocketIcon,
  GraphIcon,
  ShieldIcon,
  ReuseBrainIcon,
  ScreenCogIcon,
  BellIcon,
} from "@/components/marketing/icons/card-icons";
import { Scale } from "./scale";
import { AnimatePresence, motion } from "motion/react";
import { RealtimeSyncIcon } from "@/components/marketing/icons/bento-icons";
import { DivideX } from "./divide";
import { LogoSVG } from "./logo";
import { IconBlock } from "./common/icon-block";
import { HorizontalLine } from "./common/horizontal-line";
import { VerticalLine } from "./common/vertical-line";
import { Cards, FilePdf } from "@phosphor-icons/react";

export const Benefits = () => {
  const benefits = [
    {
      title: "Find the right source",
      description:
        "Search papers, notes, folders, and generated assets from one study surface",
      icon: <RocketIcon className="text-brand size-6" />,
    },
    {
      title: "Keep session context",
      description:
        "Continue from prior chats, files, and notes without rebuilding the background",
      icon: <RealtimeSyncIcon className="text-brand size-6" />,
    },
    {
      title: "Map ideas visually",
      description:
        "Connect concepts, dependencies, mistakes, and follow-up questions",
      icon: <GraphIcon className="text-brand size-6" />,
    },
    {
      title: "Generate durable notes",
      description:
        "Promote useful answers into markdown notes you can edit and reuse",
      icon: <ReuseBrainIcon className="text-brand size-6" />,
    },
    {
      title: "Track misconceptions",
      description:
        "Log weak spots from sessions and turn them into targeted review",
      icon: <ShieldIcon className="text-brand size-6" />,
    },
    {
      title: "Review on schedule",
      description:
        "Build spaced repetition from notes, files, and misconception history",
      icon: <ScreenCogIcon className="text-brand size-6" />,
    },
  ];
  return (
    <Container className="border-divide relative overflow-hidden border-x px-4 py-20 md:px-8">
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
          {benefits.slice(0, 3).map((benefit, index) => (
            <Card key={benefit.title} {...benefit} />
          ))}
        </div>
        <MiddleCard />
        <div className="grid grid-cols-1 gap-4">
          {benefits.slice(3, 6).map((benefit, index) => (
            <Card key={benefit.title} {...benefit} />
          ))}
        </div>
      </div>
    </Container>
  );
};

const MiddleCard = () => {
  const texts = ["Misconception logged", "Flashcards ready", "Context synced"];
  const [activeText, setActiveText] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveText((prev) => (prev + 1) % texts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="relative flex min-h-40 flex-col justify-end overflow-hidden rounded-lg border border-white/8 bg-gray-50 p-4 md:p-5 dark:bg-neutral-900">

      <div className="flex items-center justify-center">
        <IconBlock
          icon={<FilePdf weight="duotone" className="size-6 text-brand" />}
          className="border-brand/20 bg-neutral-950"
        />
        <HorizontalLine />
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-brand/40 bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
          <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)] [animation-duration:2s]"></div>
          <div className="via-brand absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)] [animation-delay:1s] [animation-duration:2s]"></div>
          <div className="relative z-20 flex h-full w-full items-center justify-center rounded-[5px] bg-white dark:bg-neutral-900">
            <LogoSVG className="size-8 text-white" />
          </div>
        </div>
        <HorizontalLine />
        <IconBlock
          icon={<Cards weight="duotone" className="size-6 text-brand" />}
          className="border-brand/20 bg-neutral-950"
        />
      </div>
      <div className="relative z-20 flex flex-col items-center justify-center">
        <VerticalLine />
        <div className="rounded-sm border border-brand/70 bg-brand/15 px-2 py-0.5 text-xs text-brand dark:text-brand">
          Connected
        </div>
      </div>
      <div className="h-60 w-full translate-x-10 translate-y-10 overflow-hidden rounded-md bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
        <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic from-transparent via-brand via-20% to-transparent to-30% blur-2xl [animation-duration:4s]"></div>
        <div className="via-brand absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic from-transparent via-20% to-transparent to-30% blur-2xl [animation-delay:2s] [animation-duration:4s]"></div>
        <div className="relative z-20 h-full w-full rounded-[5px] bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between p-4">
            <div className="flex gap-1">
              <div className="size-2 rounded-full bg-red-400"></div>
              <div className="size-2 rounded-full bg-yellow-400"></div>
              <div className="size-2 rounded-full bg-green-400"></div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                className="shadow-aceternity mr-2 flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-white"
                key={activeText}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <BellIcon className="size-3" />
                <motion.span key={activeText}>{texts[activeText]}</motion.span>
              </motion.div>
            </AnimatePresence>
          </div>
          <DivideX />
          <div className="flex h-full flex-row">
            <div className="h-full w-14 bg-gray-200 dark:bg-neutral-800" />
            <motion.div className="relative w-full gap-y-4 p-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-neutral-300">
                Study loop
              </h2>

              <div className="mt-4 flex flex-col gap-y-3 mask-b-from-50%">
                {[
                  { label: "Sources linked", width: 86 },
                  { label: "Notes updated", width: 74 },
                  { label: "Review due", width: 58 },
                ].map((item, index) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10 dark:bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.width}%` }}
                        transition={{
                          duration: 1.2,
                          delay: 0.4 + index * 0.1,
                          ease: "easeOut",
                        }}
                        className="h-full rounded-full bg-brand/75"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
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
      <h3 className="mt-4 mb-2 text-lg font-medium">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};
